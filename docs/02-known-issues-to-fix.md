# Known Issues to Fix

The existing application has deliberate defects. The candidate should use coding agents to inspect, repair, test, and improve the system rather than rewriting it blindly.

## Lead Capture

- The add-lead form allows blank customer names, blank phone numbers, invalid estimated values, and incomplete site addresses.
- The frontend sends `phone` and `siteAddress`, but the backend saves `mobile` and `address`, causing lost contact and address data for new records.
- Estimated value is stored inconsistently as a string, number, negative number, or empty value.
- Created and updated timestamps use inconsistent formats.
- There is no user feedback when a lead fails to save.
- There is no loading or disabled state during submission, so duplicate leads can be created.

## Stage Movement

- Stage names are inconsistent between seed data, frontend constants, and backend validation.
- Some seeded records disappear from the board because their stage value does not match the frontend.
- Moving a record forward fails for several stages.
- The last stage wraps back to Lead, which should not happen.
- The app does not prevent invalid or out-of-order stage transitions.
- API failure responses are treated as successful updates by the frontend.

## Data Reliability

- The app uses a JSON file as a database and overwrites it directly.
- There is no schema validation or migration path.
- IDs are generated with `Date.now()`, which can collide during fast submissions.
- Sorting mutates the loaded data.
- The API has no consistent error response shape.
- The current data model will not support team timesheets cleanly.

## Analytics

- The analytics page is mostly placeholder UI.
- The dashboard does not use the provided mock dataset.
- Stage metrics are calculated with inconsistent stage names.
- Open value includes invalid negative values.
- There is no filtering by date range, source, job type, or lead owner.
- The chart is a static visual rather than data-driven UI.

## UI and Accessibility

- The board is hard to use on small screens.
- Form fields lack validation messages.
- Keyboard and screen reader behavior has not been reviewed.
- Color, spacing, empty states, and typography do not consistently follow the required design guide.
- Long text can overflow inside cards.

## Deployment

- The app should be deployable on Railway, but the data and environment strategy are not production-ready.
- The candidate should decide whether to deploy with the included Dockerfile or Railway's direct build.
- The final deployed app must not depend on local-only files for durable business data unless the candidate clearly documents the tradeoff.

## Expected Candidate Output

- Fixed lead creation and stage movement.
- A reliable persistence approach suitable for the take-home scope.
- Useful validation and error states.
- Tests or a clear manual QA checklist for critical flows.
- A deployed Railway URL.
- A `SUBMISSION.md` describing decisions and tradeoffs.
