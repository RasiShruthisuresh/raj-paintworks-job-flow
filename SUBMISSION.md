# Submission: Raj Paintworks Job Flow

## Railway URL

**https://raj-paintworks-job-flow-production.up.railway.app**

Deployed as a single Docker service (see "Deployment" below). Persistence
verified live on 2026-07-08 — a lead created through the deployed app survives
a redeploy; see the checklist under "Deployment" for the exact steps run.

## Local setup

```bash
npm install
npm run dev
```

`npm run dev` runs the Vite client (port 5173) and the Express API (port 3001)
together. The server creates and seeds its own SQLite database on first boot —
there is no separate migration step to run by hand (`server/db/index.js` calls
the migration functions unconditionally on startup; they're no-ops once data
already exists). To run the same migration standalone: `npm run migrate`.

### Environment variables

See `.env.example` for the full annotated list. Locally, every one has a
working default and nothing needs to be set:

| Variable | Local default | Production (Railway) |
|---|---|---|
| `PORT` | `3001` | Set automatically by Railway |
| `CORS_ORIGIN` | `http://localhost:5173` | Set to the production URL above. Only actually matters for local dev (Vite client on 5173, API on 3001 — a real cross-origin call); in production the built frontend is served by the same Express app on the same origin, so these are same-origin requests regardless of this value |
| `DB_PATH` | unset → `server/data/app.db` | Set to `/data/app.db`, a Railway volume mounted at `/data` — confirmed mounted and pointed at correctly (see "Deployment") |
| `VITE_API_BASE_URL` | `http://localhost:3001` (build-time) | Left unset — relative paths work since frontend and API share an origin in production |

## What I fixed

Independently inspected `src/` and `server/` and cross-referenced findings
against `docs/02-known-issues-to-fix.md` before fixing anything (see
`docs/agent-log/01-bug-inspection.md` for the full report). **All 22 findings
resolved**; full commit-by-commit mapping in `docs/agent-log/03-progress-tracker.md`.
Grouped by `docs/02`'s own categories:

**Lead Capture**
- Blank customer names, phone numbers, invalid estimated values now rejected client- and server-side (phone must be exactly 10 digits; estimated value must be strictly positive — tightened beyond the original "non-negative" ask once a zero-value job estimate was judged unrealistic for this business).
- Fixed the `phone`/`siteAddress` vs. `mobile`/`address` field-name mismatch that was silently dropping data on every new lead.
- Estimated value now stored as a consistent number; timestamps as `new Date().toISOString()` everywhere.
- Failed saves now surface a visible error banner; the submit button disables and shows "Adding..." while in flight, closing the duplicate-submission gap.

**Stage Movement**
- Normalized all stage names to underscore format (`quote_sent`, etc.) — this was the majority convention already (frontend, both analytics mock files, 3 of 5 seed records), so the backend's space-delimited `STAGES` const and one seed record were the outliers, not the other way around.
- A lead can now only move to its immediate next stage — see "the forward-only stage decision" below.
- The last stage no longer wraps back to "Lead"; it renders a "Complete" badge instead (visually confirmed against real data: 4 of 5 seed leads sit at `invoice_sent`).
- Failed stage-move responses no longer corrupt React state — the frontend now checks `response.ok` before applying an update.

**Data Reliability**
- Flat-file `db.json` replaced with SQLite (`better-sqlite3`); schema covers `leads`, `team_members`, `time_entries`, and the analytics mock dataset.
- IDs switched from `Date.now()` to `crypto.randomUUID()` (old numeric IDs and new UUIDs coexist fine — nothing in the app parses IDs numerically).
- Fixed an in-place `.sort()` mutation, added consistent error-response shapes via a shared `withErrorHandling()` wrapper, and fixed a malformed-JSON request crashing the server outright instead of returning a 400.
- `DB_PATH` made configurable via environment variable so the database can live on a persistent volume rather than the container's ephemeral filesystem (see "Deployment").

**Analytics** — see "What I built" below; this was substantial enough to track as its own priority item rather than a bug-fix batch.

**UI and Accessibility**
- Pipeline board, the Work and Timesheets page layouts, and the top nav header are all responsive under 768px (the header specifically was found cramping/overlapping on a real phone — title wrapping into 3 lines, nav buttons squeezed — and fixed by stacking title above a full-width, evenly-split 3-button nav).
- A further mobile QA pass found analytics metric cards overflowing at ~375px (a long rupee figure exceeding its grid track's minimum width); fixed by forcing a single column under 480px and letting the value wrap/scale down rather than overflow.
- Long text in cards no longer overflows (`overflow-wrap`).
- Every form (`LeadForm`, `TeamMemberForm`, `TimeEntryForm`) shows inline field errors near the offending input.
- Currency values were inconsistent across the app (one page had no thousands grouping at all, another built its own duplicate formatting function, none used the ₹ symbol) — consolidated into one shared `formatINR()` helper used everywhere a rupee value is shown.

**Deployment** — see "Deployment" below.

## What I built

**Timesheet tracking** (`docs/03-timesheet-tracking-prd.md`) — team members
(name, role, hourly/daily rate, active status, phone) as a shared crew roster,
confirmed against the PRD's own entity model to *not* be tied to a job at
creation (only time entries reference a job). Time entries compute payable
hours from start/end/break with full validation (negative hours,
end-before-start, and — added beyond the PRD's explicit test cases — entries
against a deactivated team member are rejected with a clear message, while
entries already logged while that member was active are left untouched).
Entries can be corrected after creation. Filterable by job, team member, work
type, and date range; daily/weekly totals; job detail view shows total labor
hours and cost.

**Analytics dashboard** (`docs/04-analytics-dashboard-spec.md`) — replaced the
placeholder UI entirely. All six required sections (metric summary, stage
breakdown, source performance, job type mix, workload signal, table view) and
all five filters (date range, stage, source, job type, lead owner), computed
server-side from SQL, not a static or hardcoded frontend array.

**Design-token pass** (`docs/design.md`) — every hardcoded color, spacing, and
font value in `app.css` now reads from a CSS custom property sourced from the
design guide, applied consistently across the job board, analytics, and
timesheets so they read as one product rather than three different styles.
Four values were deliberately corrected to match the doc rather than just
wrapped in a variable: page-title size (26→28px, the doc's range starts at
28), the raised-card shadow (updated to the doc's exact spec), filter input
height (38→40px, the doc requires form fields to be at least 40px), and new
global `h2`/`h3` rules so Analytics and Timesheets section headers — which had
zero project styling before, just the browser default — picked up the same
type scale as the job board.

## How the analytics mock data is seeded

`data/paintworks_analytics_mock.csv` (12 rows) is parsed and loaded into its
own `analytics_opportunities` SQLite table by `server/db/migrate.js`'s
`migrateAnalytics()`, called unconditionally on every server boot. It's a
no-op once the table already has rows, so this is safe to run repeatedly
(including on every Railway redeploy) without duplicating data. This table is
intentionally separate from the real `leads` table — it's the provided demo
dataset for the dashboard, not live pipeline data, so seeding it never touches
or depends on actual lead records.

## Deployment

Single Express service serves both the API and the built frontend (`vite
build` output) from the same origin/port — not two separate Railway services.

**Docker build fix**: the first build failed compiling `better-sqlite3`:
`node:20-alpine` uses musl libc, so `prebuild-install` found no matching
prebuilt binary and fell back to `node-gyp`, which had no C++ toolchain to
compile with. Fixed by switching to `node:24-slim` (glibc, and matches local
Node exactly — also satisfies `concurrently`'s `engines: {"node": ">=22"}`,
which the Alpine/Node 20 image didn't) with `python3 make g++` installed as a
fallback regardless of whether a prebuilt binary is found, plus `npm ci`
instead of `npm install` for a reproducible build from the committed lockfile.

**Verified against the live deployment, 2026-07-08:**

- [x] A Railway volume is mounted at `/data`, with `DB_PATH` pointing into it — confirmed in the Railway dashboard.
- [x] `CORS_ORIGIN` is set to the production URL above.
- [x] Persistence: created a test lead via the live API, triggered a Railway redeploy, confirmed the lead survived it, deleted the test lead, and confirmed exactly 5 seed leads remain in production.
- [x] Production data cleanup: 2 stray manual-test leads (`"Engineering works"`, `"Kavya"`) were found alongside the 5 real seed leads in the live database. Removed via a temporary, secret-gated `DELETE /api/admin/leads/:id` route — fails closed (403) unless a token header matches an env var that was never committed to the repo, and deletes by exact ID only after a defensive lookup confirming exactly one match, so it could never touch more than the one row it was pointed at. The route was committed, deployed, used exactly once per stray record (confirmed via a repeat delete returning 404), then reverted and redeployed — confirmed completely absent from `server/index.js` before that revert was pushed. (One earlier draft of this route was written and reviewed but never actually committed or deployed; caught during a routine status check and discarded as unused dead code rather than left sitting in the working tree — see "Agent usage and review" below.)
- [x] Private GitHub repository with the interviewer account invited — confirmed by the candidate (not independently verifiable from within this environment; no repo-settings access).

## Agent usage and review

Built almost entirely with Claude Code across two sessions — full, unedited
transcripts in `transcripts/` (see `transcripts/README.md` for an index; one
session was cut short by a system restart mid-work, which is itself
documented rather than hidden).  Supporting write-ups in `docs/agent-log/`:
`01-bug-inspection.md` (initial independent findings), `02-verification-sweep.md`
(diagnosed a reported bug as a stale dev-server process, not a regression,
before touching any code), `03-progress-tracker.md` (running findings/commit
log, with a final dated entry summarizing everything below), `04-full-audit.md`.

Working pattern: the agent was asked to inspect and report before fixing,
changes landed in small reviewable batches (one bug-category or feature per
commit, shown as a diff before committing), and claims were checked against
real behavior rather than accepted from re-reading code:

- The timesheet PRD's two suggested test cases (8:30–17:30/60-min break → 8h;
  end-before-start rejection) were run against the live API, not just
  reasoned about from source.
- The "Complete" badge and error banners were confirmed against real seed
  data and real triggered failures, not assumed from the component code.
- Where the agent found things beyond what was explicitly asked (the
  mobile-layout gaps, the stale `.env.example`, the missing `is_active`
  check), it flagged them rather than silently fixing or silently skipping
  them.

**A caught mistake, worth being explicit about**: while building the
temporary admin cleanup route (above), a first draft was written and shown
for review, but a later status check (`git log`, `git status`) found it had
never actually been committed or pushed — it was dead, unused code sitting
only in the working tree. Rather than leave it there, it was discarded
outright and re-built properly once actually needed, then committed, used,
and reverted in a clean, verifiable sequence. Recorded here rather than
quietly cleaned up, since "caught and corrected agent mistakes" is exactly
the kind of thing this section should be honest about.

## Known limitations and tradeoffs

- **The forward-only stage decision**: a lead can only move to its immediate
  next stage — never backward, never skipping ahead. This was chosen because
  `docs/02` explicitly calls out "the app does not prevent invalid or
  out-of-order stage transitions" as a defect, and the PRD gives no case for
  needing to revert a stage. The tradeoff: if a lead is genuinely marked past
  its real stage by mistake, there's currently no way to correct it except
  editing the database directly — there's no "move backward" escape hatch.
  For the take-home's scope this seemed like the right default (matches the
  explicit ask, keeps the state machine simple), but it's a real limitation
  if Raj's actual workflow needs corrections.
- **`estimatedValue` validation tightened beyond the original findings**:
  changed from "non-negative, blank defaults to 0" to "must be strictly
  positive," because a real job estimate is never actually zero. This is
  stricter than `docs/02` literally asked for.
- **No full keyboard-navigation / screen-reader audit** — form labels,
  visible focus states, and non-color error indicators are all in place as a
  byproduct of the design-token and validation work, but a dedicated
  accessibility pass wasn't done. A real gap, not silently skipped.
- **The temporary admin route's `ADMIN_TOKEN` value** was set directly in
  Railway's dashboard for the cleanup and was never committed anywhere; it's
  effectively orphaned now that the route is gone. Worth clearing from
  Railway's variables since it no longer does anything.

## Manual QA checklist

Live-verified against real data and real API calls this session — not just
re-read from source:

- [x] Create a lead with blank name / bad phone / non-positive value → each rejected with the specific inline error.
- [x] Create a valid lead → appears on the board in the "Lead" stage.
- [x] Move a lead forward one stage → succeeds; attempt to skip a stage → rejected with a clear message.
- [x] Lead at its last stage (`invoice_sent`) shows a "Complete" badge, no move button.
- [x] Create a team member (painter, hourly rate) → appears on the roster.
- [x] Create a time entry, 8:30 AM–5:30 PM with a 60-minute break → payable hours = 8 (exact PRD test case).
- [x] Create a time entry with end time before start time → rejected.
- [x] Create a time entry for a deactivated team member → rejected with a clear message; entries logged while the member was still active are untouched.
- [x] Filter time entries by job → only that job's entries shown.
- [x] Edit an existing time entry → hours/cost recalculate correctly.
- [x] Deactivate a team member → reflected immediately in the roster.
- [x] Analytics dashboard loads all 6 required sections from real seeded data; each of the 5 filters narrows the metrics/table correctly.
- [x] Refresh the browser after creating a lead/entry → data persists (SQLite, not in-memory).
- [x] Error banners render visibly (red border/text) on a failed create or move.
- [x] Analytics page at ~375px width: metric cards stack to one column, no horizontal scrollbar, large rupee values wrap instead of overflowing.
- [x] Railway volume mounted at `/data`, `DB_PATH` pointing into it; `CORS_ORIGIN` set to the production URL.
- [x] A lead created via the live production API survives a Railway redeploy.
- [x] Exactly 5 seed leads remain in production (stray test records removed).
- [ ] Full keyboard-navigation and screen-reader pass.
- [x] GitHub repository is private and the interviewer account has been invited (confirmed by the candidate; not independently verifiable from this environment).
