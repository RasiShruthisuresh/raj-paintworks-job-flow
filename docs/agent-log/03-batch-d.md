# Batch D: findings #4, #5, #6, #7, #8, #14

All six fixed in `server/index.js`, `src/App.jsx`, `src/components/LeadForm.jsx`. Verified
against an isolated copy of the code (scratch port, scratch copy of `db.json`) — never against
the real file or the user's live server. No commits made yet; this batch is paused for
confirmation per instruction.

## 1. (#4) ISO-8601 timestamps

`Date()` (called as a function — returns a locale string like `"Mon Jul 06 2026 ..."`) replaced
with `new Date().toISOString()` in all three places new/updated timestamps get written: lead
creation (`createdAt`, `updatedAt`) and stage update (`updatedAt`). New records now match the
seed data's `"2026-06-18T10:00:00.000Z"`-style format exactly.

## 2. (#5) Collision-safe IDs

Chose **`crypto.randomUUID()`** (Node's built-in `crypto` module, no new dependency) over an
incrementing-counter scheme. Reasoning: a counter would need to scan every existing lead, coerce
mixed ID formats (short seed numbers like `"1001"` vs. 13-digit `Date.now()` values from earlier
test records) into numbers to find a max, and handle the coercion edge cases — more code, no
real benefit, since (confirmed by grep across `src/`) nothing in the app parses IDs numerically,
sorts by ID, or assumes any particular ID format. IDs are only ever used as opaque strings
(`lead.id === id`, React `key`). A UUID is a one-line, stateless, effectively-zero-collision-risk
call.

## 3. (#6) Non-mutating sort

`GET /api/leads` now sorts `[...db.leads].sort(...)` — a cloned array — instead of sorting
`db.leads` in place.

## 4. (#7) JSON error responses on file I/O failure

Added a `withErrorHandling(handler)` wrapper — explicit try/catch, written once, applied to the
four routes that call `readDb`/`writeDb` (`GET /api/leads`, `POST /api/leads`,
`PUT /api/leads/:id/stage`, `GET /api/analytics/summary`). On any thrown error (corrupt JSON,
missing file, disk failure) it now returns `500 {"message": "Unable to read or write lead data
right now."}` instead of Express's default HTML error page. A single shared wrapper was used
instead of pasting the same try/catch into four handlers.

Verified by temporarily corrupting an isolated copy's `db.json` with invalid JSON and confirming
`GET /api/leads` returned a clean `500` JSON body rather than crashing or returning HTML; server
kept working normally once the file was restored.

## 5. (#8) Stage-transition ordering validation

`PUT /api/leads/:id/stage` now computes the current and requested stage's index in `STAGES` and
rejects any transition where `requestedIndex` is neither the same index (stay put) nor
`currentIndex + 1` (immediate next), with `400 {"message": "A lead can only move to its
immediate next stage."}`. Also added a guard for a lead whose current stage doesn't match any
known `STAGES` value (defensive — without it, `currentIndex === -1` combined with a requested
index of `0` would have incorrectly been treated as "immediate next" and let a corrupted-stage
record slip through).

Verified: skip-ahead (`lead` → `invoice_sent`) rejected; immediate-next (`lead` → `quote_sent`)
accepted; stay-put (`quote_sent` → `quote_sent`) accepted; backward (`quote_sent` → `lead`)
rejected.

## 6. (#14) Create-lead race condition

- `src/App.jsx`'s `handleCreateLead` now re-throws after setting the error banner state, so the
  caller can know the request failed (previously it swallowed the error entirely).
- `src/components/LeadForm.jsx`: added `submitting` state. `submitForm` is now `async`, awaits
  `onCreateLead`, and only clears the form on success — on failure the form stays filled in
  (avoids losing the user's input) and relies on the existing app-level error banner rather than
  adding a second, redundant error message. The submit button is `disabled={submitting}` and
  reads "Adding..." while in flight, so a double-click can no longer fire two POSTs.

## #4/#5 interaction check

Confirmed no conflict between the new timestamp format and new ID format, and that both coexist
safely with old-style data already in `db.json` (pre-fix stray test records with long numeric
`Date.now()`-style IDs and `Date()`-format timestamps):

- Grepped `src/` for every `.id`/`createdAt`/`updatedAt` usage — confirmed none of it parses
  IDs numerically, sorts by ID, or parses/sorts timestamps. Both are always treated as opaque
  strings or displayed as-is.
- Ran the ordering validation (#8) against an old-style stray record (`1783331453614`, 13-digit
  ID, `invoice_sent` stage) on an isolated copy: backward move correctly rejected, stay-put
  correctly accepted — and the accepted move wrote a new ISO `updatedAt` while leaving the
  record's historical `createdAt` (old `Date()` format) untouched, exactly as expected. We don't
  retroactively migrate old records; only new writes get the new formats, and nothing breaks by
  their coexisting.

## Not touched in this batch

`server/data/db.json`'s three stray test records (still old-format IDs/timestamps) were left
alone — out of scope for Batch D, same as prior batches.
