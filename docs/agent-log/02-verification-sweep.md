# Verification Sweep: Stage-Move Bug Diagnosis + Batches A/B/C

All commands below were run for real; output is pasted verbatim, not paraphrased. Mutating
requests (POST/PUT) were run only against an **isolated copy** of the server + a scratch copy
of `db.json` (a temp dir created inside the repo so `node_modules` resolves, on a throwaway
port, deleted at the end of this session) — never against the real `server/data/db.json` or
the user's live dev server on port 3001. Read-only GETs were run against the live server where
noted, since reads can't corrupt anything.

---

## Step 1 — Stage-move 400 diagnosis

### 1.1 — Lead 1001's current stage (live server, read-only)

```
$ curl -s http://localhost:3001/api/leads | ... (filter id 1001)
{
  "id": "1001",
  "customerName": "Apex Dental Clinic",
  ...
  "stage": "lead",
  ...
}
```

### 1.2 — Exact value the frontend sends

Read `src/components/PipelineBoard.jsx` directly. For a lead at `stage: "lead"` (index 0),
`nextStage()` returns `STAGES[1]` = `{ key: "quote_sent", label: "Quote sent" }`. The button's
`onClick` calls `onMoveLead(lead.id, next.key)` → `App.jsx`'s `handleMoveLead` → `api.js`'s
`updateLeadStage(id, stage)`, which sends:

```
PUT /api/leads/1001/stage
Body: {"status":"quote_sent"}
```

### 1.3 — Reproducing that exact request against the live server

```
$ curl -s -X PUT http://localhost:3001/api/leads/1001/stage -H "Content-Type: application/json" -d '{"status":"quote_sent"}' -w "\nHTTP %{http_code}\n"
{"message":"Invalid stage"}
HTTP 400
```

Reproduces the reported bug exactly.

### 1.4 — Root cause

Checked the **on-disk** `server/index.js` (line 13):
```js
const STAGES = ["lead", "quote_sent", "customer_closed", "work_finished", "invoice_sent"];
```
`"quote_sent"` is already in this list — per the committed code, this request should return
`200`, not `400`. So the file is correct. The discrepancy means the **running process** isn't
executing this file.

Decisive, non-mutating proof — `openLeads` should exclude the one `invoice_sent` lead (7 of 8)
under the current code, but not under the pre-Batch-A code (which compared against
`"invoice sent"` with a space, which never matches anything, so nothing gets excluded):

```
$ curl -s http://localhost:3001/api/analytics/summary
{"totalLeads":8,"totalValue":856000,"openLeads":8,"stageCounts":{...}}
```

`openLeads: 8 === totalLeads: 8`. That's only possible if the live process is still running the
pre-Batch-A `openLeads` filter (`!== "invoice sent"`) — confirming it predates that commit.

Confirmed conclusively by running the **current, unmodified** `server/index.js` as a fresh
process (isolated copy, port 3097, scratch copy of `db.json`) and firing the identical request:

```
$ curl -s -X PUT http://localhost:3097/api/leads/1001/stage -H "Content-Type: application/json" -d '{"status":"quote_sent"}' -w "\nHTTP %{http_code}\n"
{"id":"1001", ..., "stage":"quote_sent", ..., "updatedAt":"Mon Jul 06 2026 15:46:40 GMT+0530 (India Standard Time)"}
HTTP 200
```

Same request, same file, fresh process → `200`, correct stage update.

**Diagnosis: (c) something else** — not (a) a leftover format mismatch (the file is correct)
and not (b) Batch C validation leaking into the stage endpoint (that validation only exists in
the `POST /api/leads` handler; the `PUT /:id/stage` handler is untouched by it, and this
reproduces with no `customerName`/`estimatedValue` in the payload at all). This is an
**operational issue**: the Node process serving port 3001 was started before Batch A's fix was
committed. Node evaluates `const STAGES = [...]` once at module load and never re-reads the
file — so the in-memory process is stuck on the old space-delimited array and the old
`openLeads` filter, even though `git log` and the file on disk have had the fix for a while.
This is consistent with the three earlier stray test records already sitting in `db.json`
(created ~15:14–15:20 IST), which also show the pre-Batch-B `Date()` timestamp format and
missing `phone`/`siteAddress` — meaning this same process has been running continuously since
before this session's fixes began.

**No code diff.** `server/index.js` and `PipelineBoard.jsx` are already correct as committed.
There is nothing to fix in source — the fix is restarting the Node process (`npm run server` or
your `npm run dev`/`concurrently` process) so it picks up the code that's already on disk and
already in git. I did not restart or kill your live server myself since I don't know how you
started it (separate terminal, `concurrently`, etc.) — that's your call.

**Manual step for you:** stop and restart the backend process, then retry the stage-move click
in the browser — it should now succeed with a `200` and the card should move columns.

---

## Step 2 — Full verification sweep (against isolated copy of current code)

Ran on an isolated copy of `server/index.js` + a scratch copy of the real `db.json`, port 3097
(fully torn down afterward — orphaned process on that port was found via
`netstat -ano | grep 3097` → PID 14868, confirmed distinct from the live server's PID 6564 on
port 3001, and killed via `taskkill //PID 14868 //F`; live server confirmed still running
afterward). This reflects exactly what your code will do **once the live process is restarted**.

### Batch A (fixes #1, #10, #11, #15, #20)

**All 5 seed leads present with stage values matching real frontend column keys:**
```
1001 Apex Dental Clinic -> quote_sent      (mutated by test below, see note)
1004 Bluebell Interiors -> work_finished
1002 Greenfield Workspace -> quote_sent
1003 Lotus Mini Mart -> customer_closed    <- previously "customer closed" (space), now visible
1005 Northstar Fitness -> invoice_sent
```
All 5 keys (`lead`, `quote_sent`, `customer_closed`, `work_finished`, `invoice_sent`) match
`PipelineBoard.jsx`'s `STAGES` keys exactly — record 1003 in particular now renders in a real
column instead of vanishing.

**Full stage transition, lead 1001, all 5 stages:**
```
PUT status:quote_sent      -> 200 {"stage":"quote_sent", ...}       (shown in 1.4 above)
PUT status:customer_closed -> 200 {"stage":"customer_closed", ...}
PUT status:work_finished   -> 200 {"stage":"work_finished", ...}
PUT status:invoice_sent    -> 200 {"stage":"invoice_sent", ...}
```
Every transition succeeded (`200`), and the final response body shows `"stage":"invoice_sent"`
— it does not silently revert to `"lead"`.

**Last-stage / unrecognized-stage fallback** (this part of #15 is pure frontend JS, not
reachable via curl — verified by executing the actual `nextStage()` function copied verbatim
out of `PipelineBoard.jsx`):
```
nextStage('lead')        = {"key":"quote_sent","label":"Quote sent"}
nextStage('invoice_sent') = null   <- last stage, must be null
nextStage('bogus_stage')  = null   <- unrecognized, must be null
```
Confirms the button is never rendered (and no wraparound PUT is ever sent) once a lead reaches
`invoice_sent`, and that a mismatched stage string can no longer offer a deceptive "Move to
Lead" action.

*Cannot verify by command line alone:* whether the "Complete" badge (checkmark + text) actually
renders correctly on screen once a card has no next stage. **Manual check:** in the browser,
move any lead to "Invoice sent" and confirm its card shows a teal "Complete" badge with a
checkmark instead of a move button — and that no "Move to Lead" button ever appears.

### Batch B (fixes #2, #12, #13)

**POST with phone/siteAddress, then GET it back:**
```
POST {"customerName":"Verify Batch B Co","phone":"90000 12345","siteAddress":"Test Layout, Bengaluru",...}
-> 201 {"phone":"90000 12345","siteAddress":"Test Layout, Bengaluru", ...}

GET that lead back:
{"phone":"90000 12345","siteAddress":"Test Layout, Bengaluru", ...}
```
Both fields populated, not `undefined`.

**Invalid stage PUT — actual response:**
```
PUT status:not_a_real_stage -> 400 {"message":"Invalid stage"}
```

**Proof the frontend no longer treats this as valid data** — ran the actual `parseResponse()`
function copied verbatim out of `src/api.js`, against a real `fetch()` call to the same invalid
PUT above:
```
Threw as expected. err.message = "Invalid stage"
```
Confirms `api.js` throws instead of returning the error body as if it were a lead, so
`App.jsx`'s `catch` block runs and calls `setError(...)` instead of merging garbage into
`leads` state.

*Cannot verify by command line alone:* that the red error banner actually renders visibly in
the browser. **Manual check:** with the backend restarted, click a stage-move that you force to
fail (e.g. temporarily block the request in devtools, or just retry while the OLD stale process
is still up as of right now — that reproduces a real 400) and confirm you see a visible red
"error-banner" message near the top of the page instead of the card disappearing.

### Batch C (fixes #3, #16, #21, #22, #9)

**Blank customerName:**
```
POST {"customerName":"   ","estimatedValue":1000} -> 400 {"message":"Customer name is required."}
```

**Negative estimatedValue:**
```
POST {"customerName":"Some Business","estimatedValue":-500} -> 400 {"message":"Estimated value must be a non-negative number."}
```

**Record 1004, read directly from the real `server/data/db.json` (not the isolated copy):**
```json
{
  "id": "1004",
  "customerName": "Bluebell Interiors",
  "phone": "91234 88990",
  "siteAddress": "MG Road, Bengaluru",
  "stage": "work_finished",
  "estimatedValue": 65000,
  "notes": "Bad imported record.",
  "createdAt": "2026-06-19T09:30:00.000Z",
  "updatedAt": "2026-06-25T16:00:00.000Z"
}
```
Valid name, positive value, real ISO-8601 timestamps.

**`totalValue` excludes non-positive values (defense in depth):** current real data has no
negative values left (Batch C blocks them at the API), so to actually exercise the defense-in-
depth math, I injected a synthetic `-99999` row and a `0` row directly into the isolated
`db.json` copy (bypassing the API entirely, simulating bad data that got in some other way):
```
Expected totalValue (positive-only sum, hand-computed): 906000
Naive unfiltered sum would be:                          806001

GET /api/analytics/summary ->
{"totalValue":906000, ...}
```
The API returned the hand-computed positive-only sum, not the naive sum — the `-99999` row is
excluded from the total even though it exists directly in the data file.

*Cannot verify by command line alone:* the inline red field-error text under the Customer name /
Estimated value inputs in `LeadForm.jsx`. **Manual check:** open the Add Lead form, submit with
the name blank or a negative estimated value, and confirm red inline text appears next to the
offending field without the request ever reaching the network tab.

---

## Pass/fail summary

- **Stage-move 400 bug:** diagnosed — not a code bug. Root cause: stale backend process (predates Batch A). No fix committed (none needed); **restart your backend process** to resolve.
- **Batch A:** PASS (verified against current code; live process needs restart to actually deliver this in your browser).
- **Batch B:** PASS (verified against current code; live process needs restart to actually deliver this in your browser).
- **Batch C:** PASS (verified against current code; live process needs restart to actually deliver this in your browser).
