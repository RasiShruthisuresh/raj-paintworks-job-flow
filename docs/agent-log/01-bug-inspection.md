# Bug Inspection

Source review of `src/` and `server/` (every file read in full), cross-referenced against
`docs/02-known-issues-to-fix.md`. No code was changed for this pass.

Files reviewed: `server/index.js`, `server/data/db.json`, `src/api.js`, `src/App.jsx`,
`src/components/LeadForm.jsx`, `src/components/PipelineBoard.jsx`, `src/pages/Analytics.jsx`,
`src/main.jsx`, `src/styles/app.css`, plus `package.json`, `vite.config.js`, `Dockerfile`,
`.env.example` for deployment-adjacent context.

---

## Server bugs (`server/index.js`)

1. **Stage vocabulary mismatch breaks almost every stage move — `server/index.js:13` vs `src/components/PipelineBoard.jsx:3-9`.**
   Backend `STAGES` is `["lead", "quote sent", "customer closed", "work finished", "invoice sent"]` (space-delimited). Frontend `STAGES` keys are `lead`, `quote_sent`, `customer_closed`, `work_finished`, `invoice_sent` (underscore-delimited), and it's these underscore keys that get PUT to `/api/leads/:id/stage`. Since `STAGES.includes(req.body.status)` (line 64) only accepts the space-delimited strings, **every forward move except into `lead` gets rejected with 400**. The only stage name that matches on both sides is `"lead"` — which is also what the wraparound bug (#16 below) sends, so that's the one move that "succeeds," silently demoting a finished job back to Lead.
   Already known — matches "Stage names are inconsistent..." and "Moving a record forward fails for several stages," but the doc undersells it: it isn't "several stages," it's effectively **all** of them.

2. **Field-name mismatch loses phone and address on every new lead — `server/index.js:41-42`.**
   `phone: req.body.mobile` and `siteAddress: req.body.address` read fields the frontend never sends (`LeadForm.jsx` posts `phone` and `siteAddress` verbatim). Every new lead is created with `phone: undefined, siteAddress: undefined`.
   Already known ("frontend sends `phone`/`siteAddress`, backend saves `mobile`/`address`").

3. **No server-side validation on `POST /api/leads` — `server/index.js:36-53`.**
   `customerName`, `phone`, `siteAddress` accept blank/undefined; `estimatedValue` accepts any type/sign with no coercion (`req.body.estimatedValue || 0` just passes through whatever the client sent, e.g. a raw string or a negative number).
   Already known.

4. **Timestamps use `Date()` instead of `new Date().toISOString()` — `server/index.js:46-47, 70`.**
   `Date()` called as a function (not `new Date()`) returns a locale-formatted string like `"Sun Jul 06 2026 00:00:00 GMT+0000 (Coordinated Universal Time)"`, not the ISO-8601 format already used throughout the seed data (`"2026-06-18T10:00:00.000Z"`). This is the concrete root cause of the known "inconsistent timestamp formats" bug — every new/updated record will use a different, harder-to-sort/parse format than the seed data.
   Already known (root cause pinpointed here).

5. **IDs generated with `Date.now().toString()` — `server/index.js:39`.**
   Two POSTs arriving within the same millisecond (realistic under a double-click, see #17) collide on `id`.
   Already known.

6. **In-place mutation on every read — `server/index.js:32`.**
   `db.leads.sort((a, b) => a.customerName.localeCompare(b.customerName))` sorts `Array.prototype.sort` in place. It's mutating a freshly-parsed object each request so it isn't currently corrupting the on-disk file, but it is exactly the pattern the known-issues doc flags, and it would corrupt shared/cached state if `readDb()` is ever memoized.
   Already known.

7. **No error handling around file I/O — `server/index.js:18-24`.**
   `readDb()`/`writeDb()` have no try/catch. A malformed `db.json` (or a read that races a concurrent write, since there's no locking and writes are not atomic) throws synchronously inside the route handler; Express's default handler returns an HTML 500 page, not JSON — breaking every consumer that expects `response.json()` to succeed (see #13/#14, where the frontend never checks `response.ok` either). This compounds the known "no consistent error response shape" issue with a concrete crash path.
   Independently found (elaborates a known architectural issue with a specific failure mode).

8. **Stage transitions aren't order-checked — `server/index.js:64-69`.**
   Any value in `STAGES` is accepted regardless of the lead's current stage, so a client could move `lead` directly to `invoice sent` or backward from `work finished` to `lead`.
   Already known ("does not prevent invalid or out-of-order stage transitions").

9. **`totalValue` includes negative estimates — `server/index.js:77`.**
   `db.leads.reduce((sum, lead) => sum + Number(lead.estimatedValue), 0)` sums every lead's value unfiltered, including seed record `1004`'s `-10000`, silently deflating the total.
   Already known ("Open value includes invalid negative values").

10. **`openLeads` filter uses the wrong stage spelling — `server/index.js:81`.**
    `lead.stage !== "invoice sent"` (space) is compared against data that actually stores `"invoice_sent"` (underscore, per seed record `1005` and everything the frontend writes). Because the two spellings never match, **no lead is ever excluded** — an invoiced job is still counted as "open." This is a concrete instance of the known "stage metrics calculated with inconsistent stage names" bug, caused by the same STAGES mismatch as #1.
    Already known (specific mechanism identified).

11. **`stageCounts` buckets by raw, unnormalized stage string — `server/index.js:82-85`.**
    Because seed/live data mixes `"invoice_sent"` and (potentially) `"invoice sent"`-style values, counts for what should be one stage can silently split across two keys in the response object.
    Already known (same root cause as #1/#10).

---

## Frontend bugs

12. **API layer never checks `response.ok` — `src/api.js:3-33` (all four functions).**
    `getLeads`, `createLead`, `updateLeadStage`, and `getAnalyticsSummary` all do `return response.json()` unconditionally. A 400/404/500 response body (e.g. `{ message: "Invalid stage" }`) is handed back to the caller as if it were a successful `Lead`/summary object, with no way for callers to distinguish success from failure.
    Already known ("API failure responses are treated as successful updates by the frontend") — note this affects **create** and **fetch**, not just stage updates, as the doc's wording might suggest.

13. **Corrupted lead replaces good state on a failed move — `src/App.jsx:21-31`.**
    Concrete consequence of #1 + #12: `handleMoveLead` takes whatever `updateLeadStage` resolved to — which, given #1, is almost always the backend's `{ message: "Invalid stage" }` error body — and swaps it into `leads` state in place of the real lead (`leads.map(lead => lead.id === id ? updatedLead : lead)`). The card loses its `id`, `stage`, `customerName`, etc., so it stops matching any `stage.key` filter in `PipelineBoard` and **silently disappears from the board** until a full reload re-fetches the untouched server copy.
    Independently found (traces the exact mechanism behind the known "fails for several stages" + "failure treated as success" bugs interacting).

14. **No feedback / no guard on create — `src/App.jsx:16-19` and `src/components/LeadForm.jsx:22-26`.**
    `handleCreateLead` doesn't surface errors, and `LeadForm.submitForm` calls `onCreateLead(form)` without awaiting it, then immediately clears the form and never disables the submit button — a slow response or a double-click fires a second POST before the first completes, and `id: Date.now()` (#5) makes a same-millisecond collision realistic.
    Already known (both "no user feedback when a lead fails to save" and "no loading/disabled state... duplicate leads").

15. **Wraparound and mismatched-stage fallback share one bug — `src/components/PipelineBoard.jsx:12-15`.**
    ```js
    function nextStage(currentStage) {
      const currentIndex = STAGES.findIndex((stage) => stage.key === currentStage);
      return STAGES[currentIndex + 1] || STAGES[0];
    }
    ```
    Two distinct inputs hit the same `|| STAGES[0]` fallback: (a) the last real stage (`invoice_sent`), where `STAGES[5]` is `undefined` — the known "last stage wraps back to Lead" bug; and (b) **any stage string that doesn't match a frontend key at all** (e.g. seed record `1003`'s `"customer closed"` with a space), where `findIndex` returns `-1` and `STAGES[0]` is selected the same way. Case (b) isn't just a display bug — combined with #1, it means a mismatched-format record would offer a deceptive "Move to Lead" action.
    Already known (wraparound) + independently found (the `-1` case shares the same root line).

16. **No client-side validation — `src/components/LeadForm.jsx:32-51`.**
    No `required`, no numeric constraint on `estimatedValue`, no inline error messages — blank name/phone/address and non-numeric or negative values all submit successfully.
    Already known.

17. **Analytics is placeholder UI disconnected from data — `src/pages/Analytics.jsx`.**
    - `fake-bars` heights (`72%, 48%, 30%, 60%, 22%`, lines 38-42) are hardcoded, not derived from `summary` or `leads`.
    - Neither the component nor anything else in `src/` imports `data/paintworks_analytics_mock.{json,csv}` — the required mock dataset is unused.
    - No filter controls exist for date range, source, job type, or lead owner.
    - `quoteValue` (line 11-13) filters on `lead.stage === "quote_sent"`, so it under-counts any lead whose stage is stored in the space-delimited backend form (same root cause as #1/#10).
    Already known (entire "Analytics" section of the known-issues doc).

---

## UI / CSS (`src/styles/app.css`)

18. **Board doesn't adapt to small screens — `app.css:131-136`.**
    `.pipeline-board { grid-template-columns: repeat(5, minmax(210px, 1fr)); overflow-x: auto; }` has no responsive breakpoint, so on a phone-width viewport it enforces a ~1050px-wide five-column layout and just scrolls horizontally instead of stacking.
    Already known ("hard to use on small screens") — concrete root cause identified.

19. **No `overflow-wrap`/`word-break` anywhere in the stylesheet.**
    `.lead-card`, `.lead-card p`, `.lead-card small` etc. have no wrapping rule, so a long unbroken token in `notes` or `siteAddress` can overflow the fixed-width card/column.
    Already known ("Long text can overflow inside cards") — concrete root cause identified.

---

## Data-quality issues in `server/data/db.json`

20. **Mixed stage-name formats across seed records** (root cause shared with bug #1/#10):
    - `1001`: `"lead"`
    - `1002`: `"quote_sent"` (underscore — matches frontend, not backend `STAGES`)
    - `1003`: `"customer closed"` (space — matches backend `STAGES`, **not** the frontend key `customer_closed`, so this card never renders in any column)
    - `1004`: `"work_finished"` (underscore)
    - `1005`: `"invoice_sent"` (underscore)
    No two records share a validated-by-both-sides convention.

21. **`estimatedValue` has inconsistent types/values across records:**
    - `1001`, `1003`, `1005`: plain numbers.
    - `1002`: `"280000"` — a **string**, not a number.
    - `1004`: `-10000` — **negative**, nonsensical for an estimate, and it's the value that leaks into the `totalValue` sum (bug #9).

22. **Record `1004` is a compounding "poison" row:**
    - `customerName: ""` — blank required field (renders as "Untitled customer" client-side, masking the bad data).
    - `createdAt: "yesterday"`, `updatedAt: "today"` — not timestamps at all; relative English words instead of ISO-8601, unparseable by `new Date(...)` (`new Date("yesterday")` is `Invalid Date`) and wildly inconsistent with every other record's `"2026-06-DDTHH:mm:ss.000Z"` format.
    - Combined with its `-10000` estimate and mismatched-looking stage, this single record exercises nearly every validation gap at once — useful as a test fixture, but it should not be able to exist once validation is added.

---

## Summary of independently-found items (not explicit bullets in `02-known-issues-to-fix.md`)

- The stage mismatch (#1) makes **all** forward transitions fail, not "several" — the doc undersells the blast radius.
- `Date()` vs `new Date().toISOString()` (#4) is the specific root cause behind the known timestamp-format complaint.
- No try/catch around `readDb`/`writeDb` (#7) — a corrupted file or read/write race throws an unhandled exception mid-request.
- The exact mechanism (#13) by which a failed stage move corrupts React state and makes a card vanish from the board.
- The `findIndex === -1` branch of `nextStage()` (#15) shares the wraparound bug's fallback line, so an unrecognized stage string also silently offers "Move to Lead."
- The `openLeads`/`stageCounts` analytics logic (#10, #11) has a specific, demonstrable off-by-spelling bug, not just a general "inconsistent" note.
- CSS root causes for the two known UI complaints: fixed 5-column grid with no breakpoint (#18), and no `overflow-wrap` anywhere in the stylesheet (#19).
