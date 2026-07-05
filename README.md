# Raj Paintworks Job Flow Take-Home

Raj runs a small commercial painting business. He created a lightweight internal tool with coding agents, but the tool is unreliable and incomplete. Your task is to use coding agents to diagnose the existing issues, fix them, add the next requested workflow, and deploy the result.

Do not rename or position the product as an enterprise sales platform. This is a practical job-flow tool for a small business owner.

## Candidate Assignment

1. Read the documents in [docs](docs).
2. Run the app locally and identify the current behavior.
3. Fix the issues listed in [docs/02-known-issues-to-fix.md](docs/02-known-issues-to-fix.md).
4. Implement the timesheet feature described in [docs/03-timesheet-tracking-prd.md](docs/03-timesheet-tracking-prd.md).
5. Design and build the analytics dashboard UI using the mock data in [data](data).
6. Apply the Airbnb-inspired design guide in [docs/design.md](docs/design.md).
7. Deploy the finished app on Railway using Docker or a direct Railway build.

## Local Setup

```bash
npm install
npm run dev
```

The frontend runs on `http://localhost:5173`. The API runs on `http://localhost:3001`.

## Submission Expectations

Create a private GitHub repository and invite @rouseguy. The repository should include:

- Clear commit history showing how you used agents and reviewed their work.
- A working deployed Railway URL.
- A `SUBMISSION.md` file describing what you fixed, what you built, known tradeoffs, and how to run the project.
- Deployment notes, including whether you used Docker or Railway's direct build flow.
- The entire coding agents transcript (all the sessions, neatly broken, including sessions/chats that failed!)

## Evaluation Focus

- How well you use coding agents while still exercising engineering judgment.
- Correctness and reliability of the fixed job-flow functionality.
- Timesheet feature completeness and data model quality.
- Dashboard UI quality and use of uploaded mock data.
- Deployment reliability on Railway.
- Small-business empathy: the app should help Raj act quickly without feeling like heavy enterprise software.

