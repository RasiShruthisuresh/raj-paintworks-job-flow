# Full Audit: Batches A–E + CORS/Error-Handling/Empty-State

Triggered by discovering that Batch D's #4/#5 fixes, while correctly committed, were not
active in practice. This audit verifies every claimed fix against **two distinct things**,
because they can disagree:

1. **The live server** (port 3001, PID 34256) — what the user's browser actually talks to
   right now. This is the literal "currently running code."
2. **The current code** (committed HEAD `3b962cb` + uncommitted working-tree changes) — what
   would run if the process were restarted right now.

**Headline finding: the live process (PID 34256) has been running, unrestarted, since
2026-07-06 21:43:13 IST** (confirmed via `wmic process ... get CreationDate`). Batch D
(`de16c21`) was committed at 22:30:50 IST — **47 minutes after this process started.**
Everything from Batch D onward (Batch D, Batch E, phone/estimatedValue tightening, the
SQLite migration) is invisible to it. Batches A/B/C (committed before 21:43) are correctly
active on it. This single fact explains essentially every discrepancy below — it is not
scattered regressions, it's one stale process plus one genuinely-unfinished piece of work
(see item 15).

No softening: every row below is PASS or FAIL. Mixed results are reported as two rows.

---

## Pass/fail table

| # | Item | Live server | Current code | Notes |
|---|---|---|---|---|
| 1 | #1/#10/#11/#20 — all 5 seed leads, valid stage keys | **PASS** | PASS | See 1.1 |
| 2 | #15 — no wrap to Lead, shows "Complete" | N/A (frontend-only) | **PASS** (source) | See 2.1 |
| 3 | #2 — new lead phone/siteAddress not undefined | **PASS** | PASS | See 3.1 |
| 4 | #12/#13 — clean error, no state corruption | **PASS** (basic shape) | PASS (source) | See 4.1 |
| 5 | #3/#16 — blank name / non-positive value rejected | **MIXED** | PASS | See 5.1 |
| 6 | #21/#22 — no poison records | **FAIL** | — | See 6.1 |
| 7 | #4 — new lead ISO-8601 timestamp | **FAIL** | PASS (source) | See 7.1 |
| 8 | #5 — new lead UUID/safe ID | **FAIL** | PASS (source) | See 7.1 |
| 9 | #6 — sort doesn't mutate | N/A (unobservable via HTTP) | **PASS** (by design) | See 9.1 |
| 10 | #7 — malformed JSON clean error | **FAIL** | **FAIL** | See 10.1 — genuine current gap |
| 11 | #8 — stage-order enforcement | **FAIL** | PASS, but see flag | See 11.1 — premise conflict |
| 12 | #14 — no duplicate on rapid double-click | N/A (browser-only) | **PASS** (source) | See 12.1 |
| 13 | Phone validation active | **FAIL** | PASS | See 13.1 |
| 14 | #18/#19 — mobile stacking, text wrap | N/A (visual) | **PASS** (source) | See 14.1 |
| 15 | CORS restricted via CORS_ORIGIN | **FAIL** | **FAIL** | See 15.1 — genuine current gap |

---

## Evidence

### 1.1 — GET /api/leads (live), all stage values
```
$ curl -s http://localhost:3001/api/leads
[
  {"id":"1783360160146", ...},                          <- poison, see #6
  {"id":"1001","stage":"invoice_sent", ...},
  {"id":"1004","stage":"invoice_sent", ...},
  {"id":"1783361023189", ...},                           <- poison, see #6
  {"id":"1002","stage":"invoice_sent", ...},             <- see caveat below
  {"id":"1783360567850", ...},                           <- poison, see #6
  {"id":"1003","stage":"customer_closed", ...},
  {"id":"1005","stage":"invoice_sent", ...},
  {"id":"1783360970799", ...},                           <- poison, see #6
  {"id":"1783361023014", ...}                            <- poison, see #6
]
```
All 5 original seed records (1001–1005) have stage values matching a real frontend
`STAGES` key. **PASS.** Caveat: 1002 shows `invoice_sent` because *my own test for item 11*
(multi-stage-skip) mutated it live — its stage before this audit was `customer_closed`. This
is a side effect of the audit itself, not a pre-existing bug; flagging for cleanup.

### 2.1 — nextStage() source (PipelineBoard.jsx:12-18)
```js
function nextStage(currentStage) {
  const currentIndex = STAGES.findIndex((stage) => stage.key === currentStage);
  if (currentIndex === -1 || currentIndex === STAGES.length - 1) {
    return null;
  }
  return STAGES[currentIndex + 1];
}
```
Returns `null` at the last stage or an unrecognized one; JSX renders a "Complete" badge
instead of a button when `next` is null (lines 42-52). This is pure frontend logic served by
Vite (not subject to the Node backend's staleness). **Cannot visually confirm without a
browser** — recommend you check in-browser, but source is correct.

### 3.1 — POST with phone + siteAddress (live)
```
$ curl -s -X POST http://localhost:3001/api/leads -d '{"customerName":"Field Check Co","phone":"9123456780","siteAddress":"Test Address Layout","estimatedValue":8000}'
{"id":"1783361023189","customerName":"Field Check Co","phone":"9123456780","siteAddress":"Test Address Layout", ...}
HTTP 201
```
Both fields populated. **PASS** — this fix (Batch B) predates the live process's start, so
it's active. (This record itself is now poison data — see #6.)

### 4.1 — invalid stage PUT (live) + frontend source
```
$ curl -s -X PUT http://localhost:3001/api/leads/1001/stage -d '{"status":"not_a_stage"}'
{"message":"Invalid stage"}
HTTP 400
```
Clean JSON. `src/api.js`'s `parseResponse` throws on `!response.ok` (confirmed in source);
`App.jsx`'s `handleMoveLead`/`handleCreateLead` catch and set the error banner without
merging the error into `leads` state. **PASS** on both counts.

### 5.1 — blank name vs. zero value (live)
```
$ curl -s -X POST http://localhost:3001/api/leads -d '{"customerName":"","estimatedValue":0}'
{"message":"Customer name is required."}                    <- correctly rejected
HTTP 400

$ curl -s -X POST http://localhost:3001/api/leads -d '{"customerName":"Zero Value Test","phone":"9876543210","estimatedValue":0}'
{"id":"1783361023014", ..., "estimatedValue":0, ...}          <- WRONGLY ACCEPTED
HTTP 201
```
Blank-name rejection is Batch C (`b6ef80a`, before the live process started) — **PASS live**.
Zero-value rejection is `ae537aa` (after the live process started) — **FAIL live**, confirmed
`estimatedValue: 0` was accepted and stored. Current code (`server/index.js` line 82-86)
correctly rejects `estimatedValue <= 0` — **PASS** on a restart. Client-side (`LeadForm.jsx`
line 29-32) also correctly rejects it — not live-tested (browser-only), but present in source.

### 6.1 — poison records, live count right now
```
$ curl -s http://localhost:3001/api/leads | ... 
total records: 10
1783360160146 | ape                        | work_finished  | 120000
1001          | Apex Dental Clinic         | invoice_sent   | 120000
1004          | Bluebell Interiors         | invoice_sent   | 65000
1783361023189 | Field Check Co             | lead           | 8000
1002          | Greenfield Workspace       | invoice_sent   | 280000
1783360567850 | hello                      | customer_closed| 120000
1003          | Lotus Mini Mart            | customer_closed| 76000
1005          | Northstar Fitness          | invoice_sent   | 195000
1783360970799 | Phone Test                 | lead           | 5000
1783361023014 | Zero Value Test            | lead           | 0
```
**FAIL, unambiguously.** 5 poison records exist right now. Full honesty: 2 of them ("ape",
"hello") predate this audit (your own manual testing between messages); 3 of them
("Field Check Co", "Phone Test", "Zero Value Test") were created *by this audit's own
required live tests* (items 3, 5, 13). All 5 need cleanup, same as before — this will keep
recurring for as long as manual testing continues against the un-restarted live process.

### 7.1 / 8.1 — dedicated fresh test lead, created just now
```
$ curl -s -X POST http://localhost:3001/api/leads -d '{"customerName":"Audit Timestamp ID Check","phone":"9988776655","estimatedValue":1000}'
{
  "id": "1783361236208",
  "customerName": "Audit Timestamp ID Check",
  ...
  "createdAt": "Mon Jul 06 2026 23:37:16 GMT+0530 (India Standard Time)",
  "updatedAt": "Mon Jul 06 2026 23:37:16 GMT+0530 (India Standard Time)"
}
HTTP 201
```
`id` is a raw `Date.now()` value, not a UUID. `createdAt`/`updatedAt` are locale strings, not
ISO-8601. **FAIL, live** — exactly the symptom that triggered this audit. Current code
(`server/index.js` lines 94-96) uses `crypto.randomUUID()` and `new Date().toISOString()` —
confirmed present, would produce a correct record on restart. **PASS in code.**

### 9.1 — sort mutation
Not observable via HTTP: each request reads fresh data before sorting, so no external
response can distinguish "sorted a clone" from "sorted in place." The current (uncommitted)
SQLite rewrite eliminates the question architecturally — sorting now happens via
`ORDER BY customer_name COLLATE NOCASE` inside the SQL query itself
(`server/index.js` line 55), there is no in-memory array being mutated at all anymore.
**PASS by design**, can't meaningfully test against the live process's internals.

### 10.1 — malformed JSON (live AND current code)
```
$ curl -s -i -X POST http://localhost:3001/api/leads -d '{ bad json'
HTTP/1.1 400 Bad Request
Content-Type: text/html; charset=utf-8
<!DOCTYPE html>...<pre>SyntaxError: Expected property name...
    at JSON.parse (&lt;anonymous&gt;)
    at parse (D:\...\body-parser\lib\types\json.js:92:19)...
```
**FAIL, live** — HTML stack trace, not JSON, as before. **Also FAIL in the current working
tree right now** — checked directly:
```
$ grep -n "entity.parse.failed" server/index.js
(no output — not found)
```
This is not just staleness. While splitting the SQLite-migration work into separate commits
per your instruction, I temporarily reverted this fix out of `server/index.js` to isolate the
route-update commit, and got interrupted (twice) before reapplying it. It currently exists
only in an uncommitted scratch backup file, not in the actual project. **This is a real,
current gap I introduced and haven't finished closing.**

### 11.1 — stage-order enforcement: premise conflict
Tested against **current code** (isolated instance, fresh 5-lead seed, not the stale live
process):
```
1002 (quote_sent) -> lead:            400 "A lead can only move to its immediate next stage."   <- one-step-BACK: REJECTED
1003 (customer_closed) -> work_finished: 200 (succeeds)                                          <- one-step-forward: accepted
1004 (work_finished) -> lead:         400 "A lead can only move to its immediate next stage."   <- multi-step-back: REJECTED
1005 (invoice_sent) -> lead:          400 "A lead can only move to its immediate next stage."   <- backward-from-last: REJECTED
1001 (lead) -> lead:                  200 (succeeds)                                             <- stay-put: accepted
```
Your audit item states *"single-step-back is allowed."* **That is not what's implemented, and
never was** — Batch D's original spec (which you wrote) said: *"a lead should only be able to
move to its immediate next stage or stay put, not jump arbitrarily forward or backward."* The
current code matches that spec exactly: stay-or-immediate-forward only, **all backward moves
rejected including one-step-back**. I'm flagging this rather than marking pass/fail, because
I don't know which is actually wanted — the original spec (no backward at all), or a newly
intended one-step-back allowance. Please confirm which you want; I have not changed anything.

Separately, on the **live** server: every transition (multi-step forward, one-step-back,
multi-step-back, backward-from-last) succeeded with `200` — order validation is entirely
absent, consistent with the process predating Batch D. **FAIL, live.**

### 12.1 — double-click dedup source
`LeadForm.jsx` lines 40, 56, 108: `submitForm` is `async`, sets `submitting=true` before
calling `onCreateLead`, and the button has `disabled={submitting}`. This is browser-timing
behavior — cannot be tested via curl. **PASS in source**; recommend an actual double-click
test in-browser for full confidence.

### 13.1 — phone validation (live vs. current code)
```
$ curl -s -X POST http://localhost:3001/api/leads -d '{"customerName":"Phone Test","phone":"123","estimatedValue":5000}'
{"id":"1783360970799", ..., "phone":"123", ...}
HTTP 201
```
**FAIL, live** — 3-digit phone accepted and stored unformatted. Current code
(`server/index.js` lines 27-31, `normalizePhone`) rejects this and normalizes valid numbers —
confirmed present in source and previously verified via isolated testing when this was built.
**PASS in code.**

### 14.1 — responsive breakpoint + text wrap, source
```css
@media (max-width: 768px) {
  .pipeline-board { grid-template-columns: 1fr; }
  .stage-column { min-height: auto; }
}
...
.lead-card { ...; overflow-wrap: break-word; ... }
```
Both present in `src/styles/app.css` (committed in Batch E, `afc49ed`). CSS is a static asset
Vite serves directly — not subject to the Node backend's staleness. **PASS in source**;
visual confirmation (resize a browser window, or a long unbroken string in notes) not done
here since it requires a browser.

### 15.1 — CORS (live AND current code)
```
$ curl -s -i -X OPTIONS http://localhost:3001/api/leads -H "Origin: http://evil.example.com" ...
Access-Control-Allow-Origin: *
```
**FAIL, live** — wide open, any origin. **Also FAIL in the current working tree right now**:
```
$ grep -n "CORS_ORIGIN\|cors(" server/index.js
15:app.use(cors());
```
Same root cause as #10: the `CORS_ORIGIN` env var change was temporarily reverted mid-commit-
split and never reapplied before being interrupted. **Real, current gap**, not just staleness.

---

## What actually needs fixing right now

Two genuinely broken-in-the-actual-codebase items, not just stale-process artifacts:
- **#10 — malformed-JSON error middleware**: reverted, never reapplied. Needs to go back in.
- **#15 — CORS_ORIGIN**: same situation. Needs to go back in.

One open question needing your decision, not a bug:
- **#11 — stage-order direction**: current code matches the original Batch D spec (no backward
  moves at all). Your audit phrasing implies one-step-back should be allowed. Which is
  actually wanted?

One data-hygiene item, recurring by nature of live testing:
- **#6 — 5 poison records** currently in `db.json` (2 pre-existing + 3 created by this audit's
  own required live tests). Will need cleanup again, and will keep recurring until the SQLite
  migration is finished and the stale process is retired.

Everything else (items 1-5, 7-9, 12-14) is correctly implemented in the current codebase; the
live-server failures for #4, #5, #7 (partially), #13 are the stale-process issue, not
regressions — confirmed by timestamp (process started 21:43:13, Batch D committed 22:30:50)
and by the fact that Batches A/B/C (committed before the process started) are all correctly
active on it.
