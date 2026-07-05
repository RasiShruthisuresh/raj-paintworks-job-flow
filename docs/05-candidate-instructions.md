# Candidate Instructions

You are encouraged to use coding agents throughout this assignment. The point is not to prove you can type everything manually. The point is to show that you can direct agents, verify their work, make good product and engineering decisions, and ship a working result.

## Required Work

- Fix the existing job-flow bugs.
- Improve validation, error handling, and persistence.
- Add the timesheet tracking feature.
- Build the analytics dashboard using the provided mock data.
- Apply the design guide consistently.
- Deploy on Railway.

## GitHub and Railway

- Create a private GitHub repository.
- Invite the interviewer account to the repository.
- Push your final code to GitHub.
- Deploy the app on Railway.
- You may deploy directly from Railway's build system or with Docker.
- If you use Docker, make sure the Dockerfile builds from a clean checkout.
- Include all required environment variables in your submission notes without sharing secrets.

## What to Include in `SUBMISSION.md`

- Railway URL.
- Local setup instructions.
- What you fixed.
- What you built.
- How you loaded the analytics mock data.
- How you used agents and how you reviewed their output.
- Known limitations or tradeoffs.
- Any test commands or manual QA checklist.

## Suggested Agent Workflow

- Ask an agent to inspect the code and produce a bug list.
- Ask an agent to propose a persistence model before implementation.
- Implement in small steps and run the app after each meaningful change.
- Use agents for test generation, but inspect the tests yourself.
- Use agents to prepare deployment config, then verify it in Railway.

## Timebox

Plan for 4-6 focused hours. If you run out of time, prioritize:

1. Correct lead creation and stage movement.
2. Durable persistence and deployability.
3. Timesheet core flow.
4. Data-driven analytics UI.
5. Additional polish.
