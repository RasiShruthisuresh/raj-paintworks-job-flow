# Analytics Dashboard Spec

The analytics dashboard is part of the take-home assignment. The candidate should design and implement the UI, upload the provided mock data to the chosen database, and drive the dashboard from data rather than static placeholders.

## Data

Use the files in [data](../data):

- `paintworks_analytics_mock.csv`
- `paintworks_analytics_mock.json`

The candidate can choose either file for loading, but the dashboard should read from the application backend or database, not from a hardcoded frontend array.

## Required Dashboard Sections

- Metric summary: total leads, open opportunity value, closed value, invoices sent, average quote-to-close days.
- Stage breakdown: count and value by stage.
- Source performance: leads and closed value by source.
- Job type mix: count and estimated value by job type.
- Workload signal: average crew size and upcoming workload by active jobs.
- Table view: recent opportunities with customer name, stage, value, source, job type, and owner.

## Filters

- Date range.
- Stage.
- Source.
- Job type.
- Lead owner.

## UI Requirements

- Use the Airbnb-inspired design guide in [design.md](design.md).
- The dashboard should feel operational, not like a marketing page.
- Charts should have clear labels and empty states.
- Values should be formatted for Indian rupees.
- The dashboard must be responsive enough for a laptop and mobile browser.

## Acceptance Criteria

- Mock data is loaded into the chosen persistence layer.
- Dashboard values match the loaded mock data.
- Filters change the visible metrics and table.
- Static fake bars are removed.
- The dashboard UI is polished and consistent with the rest of the app.
