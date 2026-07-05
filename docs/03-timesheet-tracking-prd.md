# Product Requirements: Team Timesheet Tracking

## Problem

Raj sends painters and supervisors to customer sites. Today he tracks attendance and hours through phone calls and WhatsApp messages. This makes it hard to know labor cost by job, which crew members worked at which site, and whether a completed job was profitable.

The next product feature should let Raj track team time against painting jobs.

## Goals

- Record daily work done by team members at customer sites.
- Associate time entries with a customer/job in the existing job-flow tool.
- Help Raj understand labor hours and labor cost per job.
- Keep data entry lightweight enough for a small team.

## Users

- Raj: reviews hours, cost, and job progress.
- Site supervisor: records who worked and for how long.
- Office assistant: may correct entries and export summaries.

## Core Entities

### Team Member

- Name
- Role: painter, supervisor, helper, contractor
- Daily rate or hourly rate
- Active/inactive status
- Phone number

### Time Entry

- Job/customer reference
- Team member reference
- Work date
- Start time
- End time
- Break minutes
- Computed payable hours
- Work type: prep, primer, painting, cleanup, rework, travel
- Notes
- Created at and updated at

## Functional Requirements

- Raj can add, edit, and deactivate team members.
- Raj can create a time entry for a team member and associate it with an existing job.
- The app calculates payable hours from start time, end time, and break minutes.
- The app prevents negative hours, impossible times, and entries without a job or team member.
- Raj can view timesheets by date range.
- Raj can filter timesheets by job, team member, and work type.
- Each job detail view should show total labor hours and estimated labor cost.
- The time tracking page should show daily totals and weekly totals.
- Raj can correct an entry after it is created.

## Nice-to-Have Requirements

- CSV export for a selected week.
- Bulk add entries for a whole crew on the same job and date.
- Highlight unusually long days.
- Show labor cost as a percentage of estimated job value.

## Acceptance Criteria

- A reviewer can create a team member, create a time entry, refresh the page, and see the data persist.
- Payable hours are calculated correctly for normal entries and entries with breaks.
- Invalid time entries show clear validation errors.
- Job cards or job details display total labor hours once timesheets exist.
- The feature works on the deployed Railway app.

## Suggested Test Cases

- Create a painter with an hourly rate.
- Create an 8:30 AM to 5:30 PM entry with a 60-minute break and verify payable hours are 8.
- Try to create an entry where end time is before start time and verify it is rejected.
- Filter entries by one job and verify unrelated jobs are hidden.
- Refresh the browser and verify entries remain.
