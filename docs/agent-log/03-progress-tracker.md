# Progress Tracker (living doc — update every session, source material for SUBMISSION.md)

Status as of last update: **Batches A–E all committed. All 22 original findings resolved (19 fixed, 3 diagnosed as non-issues — see below). Plus: stricter estimatedValue/phone validation, db.json fully cleaned of manual-test records, CLAUDE.md added (gitignored, local-only). Next up per CLAUDE.md's priority order: SQLite persistence migration, then timesheet feature, then analytics dashboard, then design-token pass, then Railway deploy.**

See `CLAUDE.md` (gitignored, not in this repo's git history) for full project context, deadline, and working-style instructions — read it at the start of every session.

Findings are numbered per `docs/agent-log/01-bug-inspection.md`. Don't renumber that file —
always refer back to it by number.

---

## Findings status (22 total)

| # | One-line description | Status | Commit |
|---|---|---|---|
| 1 | Backend/frontend stage-name format mismatch (space vs underscore) | Fixed | `6bb4609` |
| 2 | POST /api/leads reads `mobile`/`address`, frontend sends `phone`/`siteAddress` | Fixed | `4ace266` |
| 3 | No server-side validation on POST /api/leads | Fixed | `b6ef80a` |
| 4 | `Date()` instead of `new Date().toISOString()` for timestamps | Fixed | `de16c21` |
| 5 | IDs generated with `Date.now()` — collision risk | Fixed (`crypto.randomUUID()`) | `de16c21` |
| 6 | `db.leads.sort()` mutates in place | Fixed | `de16c21` |
| 7 | No error handling around `readDb`/`writeDb` file I/O | Fixed | `de16c21` |
| 8 | No stage-transition order validation (any stage → any stage) | Fixed | `de16c21` |
| 9 | `totalValue` included non-positive `estimatedValue` | Fixed | `b6ef80a` |
| 10 | `openLeads` filtered on wrong stage spelling | Fixed | `6bb4609` |
| 11 | `stageCounts` bucketed by unnormalized stage string | Fixed (resolved structurally by #1/#20 data normalization) | `6bb4609` |
| 12 | `src/api.js` never checked `response.ok` | Fixed | `4ace266` |
| 13 | Failed stage-move response corrupted React state | Fixed | `4ace266` |
| 14 | No loading/disabled state on lead submit (duplicate submits possible) | Fixed | `de16c21` |
| 15 | `nextStage()` wrapped last/unrecognized stage back to "Lead" | Fixed | `6bb4609` |
| 16 | No client-side validation in `LeadForm.jsx` | Fixed | `b6ef80a` |
| 17 | Analytics page is placeholder UI, ignores mock dataset, no filters | Open — becomes item 3 in CLAUDE.md's priority list | — |
| 18 | Pipeline board not responsive on small screens | Fixed (Batch E) | `afc49ed` |
| 19 | No `overflow-wrap` — long text can overflow cards | Fixed (Batch E) | `afc49ed` |
| 20 | Mixed stage-name formats in seed `db.json` | Fixed | `6bb4609` |
| 21 | `estimatedValue` inconsistent types in seed data (string/number) | Fixed | `b6ef80a` |
| 22 | Seed record 1004: blank name, negative value, non-ISO timestamps | Fixed | `b6ef80a` |

**21 of 22 fixed and committed. 1 still open: #17 (analytics dashboard rebuild) — now tracked as its own priority item in `CLAUDE.md` rather than a "batch," since it's a substantial feature (mock-data-driven dashboard + filters), not a small fix.**

---

## Commit log

- `3078c43` — Initial bug-inspection report (22 findings, `01-bug-inspection.md`)
- `6bb4609` — Batch A: stage-name normalization (#1, #10, #11, #15, #20)
- `4ace266` — Batch B: lost fields / silent API failures / corrupted state (#2, #12, #13)
- `b6ef80a` — Batch C: lead validation + seed data cleanup (#3, #16, #21, #22, #9)
- `fd1fbb5` — Verification sweep + stage-move 400 diagnosis (`02-verification-sweep.md`)
- `de16c21` — Batch D: timestamps, IDs, sort mutation, file I/O error handling, stage-order
  validation, create-lead race condition (#4, #5, #6, #7, #8, #14); see `03-batch-d.md`
- `afc49ed` — Batch E: responsive board breakpoint + card text wrapping (#18, #19), CSS-only
- `ae537aa` — Tighten lead validation beyond the original 22 findings: `estimatedValue` must be
  strictly positive (was: non-negative, blank defaulted to 0); new phone-number validation
  requiring exactly 10 digits, with formatting/country-code normalization
- `e106bf5` — Ignore `CLAUDE.md` (local-only session context, never pushed)
- `69b709e` — Remove 7 leftover manual-test records from `db.json`, leaving only the 5 original
  seed leads (1001–1005)

---

## Bugs reported but diagnosed as non-code (operational, not in findings list)

- **Stage-move 400, reported twice** (lead 1001, then lead 1783331453614): root cause was a
  **stale backend Node process** — it was started before Batch A's fix was committed, and
  `const STAGES = [...]` is only evaluated once at module load, so the running process kept
  serving the old space-delimited array from memory even after the file on disk (and git) had
  the fix. No code change was needed either time; the fix was restarting the process. Confirmed
  resolved by the user after restarting. Worth a line in SUBMISSION.md's bug narrative: *"stale
  dev server process masked an already-fixed bug — not a regression."*

---

## Manual QA still outstanding (flagged in `02-verification-sweep.md`, not yet confirmed in-browser)

- [ ] "Complete" badge (checkmark + text) renders correctly on a lead's last stage, no move button shown.
- [ ] Red inline error banner renders visibly in the browser on a failed create/move (not just proven via curl+parseResponse).
- [ ] Red inline field-error text renders under Customer name / Estimated value on invalid form submission.

---

## Draft notes for SUBMISSION.md (decisions & tradeoffs — expand as we go)

- **Stage format decision:** normalized to underscore-delimited (`quote_sent`, etc.) rather than
  space-delimited, because it was already the majority convention — used by the frontend, the
  provided analytics mock dataset (JSON + CSV), and 3 of 5 seed records. Only the backend
  `STAGES` const and one seed record used spaces.
- **`estimatedValue` decision revised mid-project:** initially kept a lenient default (blank →
  `0`, non-negative accepted) so an early-stage lead with no known value could still be saved.
  User later tightened this explicitly: a real job estimate is never zero, so `estimatedValue`
  must now be strictly positive (`> 0`) both client- and server-side — blank/0/negative all
  rejected. Superseded the original lenient design.
- **Phone validation added beyond the original 22 findings:** exactly 10 digits required,
  matching the existing customerName/estimatedValue validation pattern. Normalizes common
  formatting (spaces, dashes) and strips a `+91`/`91` country-code prefix *only* when doing so
  leaves exactly 10 digits (so a genuine 10-digit number that happens to start with `91`, like
  seed record 1004, is never mistakenly altered). Stored phone numbers are reformatted to the
  same `"XXXXX XXXXX"` convention the seed data already uses.
- **`db.json` test-record cleanup:** initially left alone pending a decision on scope; by the
  time it was actually cleaned up, manual testing had produced 7 leftover records (not 3) — all
  removed, keeping only the 5 original seed leads. If more manual testing happens against the
  live/dev server going forward, expect this to recur; the file is not a durable store (see
  "Not yet started" — SQLite migration addresses this).
- **No fix committed for the two stage-move 400 reports** — correctly diagnosed as an
  unrestarted server process both times, not a regression; verified via isolated fresh-process
  reproduction before concluding "no code change."
- **ID format decision (#5):** chose `crypto.randomUUID()` over an incrementing-counter scheme —
  simpler given the current data (mixed short/long numeric string IDs already in `db.json`),
  zero-dependency, and nothing in the app parses IDs numerically or assumes a format, so
  switching formats for new records only (not migrating old ones) is safe. Confirmed old-format
  IDs and new UUIDs coexist fine.
- **Error-handling pattern (#7):** used one shared `withErrorHandling()` wrapper around the four
  DB-touching routes instead of pasting try/catch into each — avoids duplicating identical
  boilerplate four times.
- **Create-lead race (#14):** on a failed create, the form now keeps the user's input instead of
  clearing it, and relies on the existing app-level error banner rather than adding a second,
  redundant inline error — required changing `handleCreateLead` in `App.jsx` to re-throw after
  setting the banner state, so `LeadForm` can know the request failed.
- (add more here as later batches land)

---

## Not yet started (see CLAUDE.md for the authoritative priority order)

1. SQLite persistence migration (`better-sqlite3`) — replaces flat-file `db.json`, adds
   `team_members`/`time_entries` schema for the timesheet feature. In progress per CLAUDE.md.
2. Timesheet feature per `03-timesheet-tracking-prd.md` — build exactly what the PRD specifies
   and satisfy its stated test cases, nothing extra.
3. Analytics dashboard rebuild per `04-analytics-dashboard-spec.md` using the mock data in
   `data/` — closes finding #17. Required sections/filters only.
4. Design-token pass per `design.md` — obvious colors/spacing/type, not pixel-perfect polish.
5. Railway deployment + `SUBMISSION.md` itself.

Deadline: submit by Tuesday. Time is tight — stay scoped to what each doc specifies.

---

## Final status — 2026-07-08

Everything in the "Not yet started" list above is now done, and finding **#17
(analytics placeholder UI) is fixed** — that closes all 22 original findings
(22/22, not 21/22 as the table above still shows; not editing that table itself,
since it's an accurate record of what was true when it was written — recording
the correction here instead). `SUBMISSION.md` is now the canonical, up-to-date
summary of fixes/features/tradeoffs; this entry is a log of what happened
between the last update above and final submission, not a replacement for it.

- **SQLite persistence migration** — flat-file `db.json` replaced with
  `better-sqlite3`; schema covers `leads`, `team_members`, `time_entries`, and
  the analytics mock dataset. `DB_PATH` later made configurable via env var so
  it can point at a Railway volume. (`3b962cb`, `9442541`, `5bae45d`, `b576ef9`,
  `a26119d`, `d9b1f86`)
- **Timesheet tracking** (`docs/03-timesheet-tracking-prd.md`) — team members as
  a shared crew roster, time entries with payable-hours calculation and
  validation, edit/correct action, filters, daily/weekly totals, job labor
  cost. Both of the PRD's suggested test cases (8:30–17:30/60-min break → 8h;
  end-before-start rejection) verified against the live API, not just read from
  source. (`8250dc7`, `0d667a2`, `8d36678`, `d9b385a`)
- **Analytics dashboard** (`docs/04-analytics-dashboard-spec.md`, closes #17) —
  placeholder UI replaced entirely; all 6 required sections and all 5 filters,
  computed server-side from the seeded CSV data, not a hardcoded frontend array.
  (`c967370`, `950ec09`, `004acc3`)
- **Design-token pass** (`docs/design.md`) — every hardcoded color/spacing/font
  value in `app.css` replaced with a token from the design guide; surfaced and
  fixed 3 mobile-responsiveness gaps not in the original findings (`.work-layout`,
  `.timesheets-layout`, `.topbar` had no breakpoint at all). A later pass fixed a
  4th, narrower mobile gap found in QA: analytics metric cards overflowing at
  ~375px, plus small consistency fixes (card shadow, filter-input padding) to
  match the Work page. (`6ac13c3`, `02a4ec8`, `cb312c3`, `2195dba`)
- **Currency formatting + inactive-member validation** — added one shared
  `formatINR()` helper used everywhere a rupee value is displayed (previously
  inconsistent: one page had no grouping at all, another built its own
  duplicate formatting function); `POST /api/time-entries` now rejects entries
  against a deactivated team member. (`db0d83c`, `e836474`)
- **Railway deployment** — first Docker build failed compiling
  `better-sqlite3`: `node:20-alpine`'s musl libc had no matching prebuilt
  binary, and node-gyp's fallback compile had no C++ toolchain to compile with.
  Fixed by switching to `node:24-slim` (glibc, matches local Node, satisfies
  `concurrently`'s `>=22`), adding the toolchain as a fallback regardless, and
  `npm ci` for a reproducible build. (`b8c00c2`)
- **Production data cleanup** — 2 stray manual-test leads (`"Engineering works"`,
  `"Kavya"`) found in the live Railway database, alongside the 5 real seed
  leads. Cleaned up via a temporary, secret-gated `DELETE /api/admin/leads/:id`
  route (fails closed if the secret env var isn't set; deletes by exact ID only,
  after a defensive lookup confirming exactly one match). First draft of this
  route was written, reviewed, but never committed or deployed — caught during
  a status check and discarded as unused dead code rather than left sitting in
  the working tree. Re-added, committed, deployed, used once to delete both
  stray records (confirmed via repeat-delete returning 404), then reverted and
  redeployed — confirmed the route is completely gone from `server/index.js`
  before pushing the revert. (`60b5a3d`, `be8efde`)
- **Persistence verified live, 2026-07-08**: confirmed a Railway volume is
  mounted at `/data` with `DB_PATH` pointing into it and `CORS_ORIGIN` set to
  the production URL; created a test lead via the live API, triggered a
  redeploy, confirmed the lead survived, deleted it, and confirmed exactly 5
  seed leads remain in production.
- **Both Claude Code sessions exported** as readable markdown transcripts in
  `transcripts/` (including the overnight session that was cut short by a
  system restart), for agent-usage review. (`7b9201f`)
