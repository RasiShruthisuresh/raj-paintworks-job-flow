# Product Requirements: Raj Paintworks Job Flow

## Background

Raj runs a small commercial painting business in Bengaluru. He handles customer conversations, site visits, quotations, crew assignments, work completion, and invoice follow-up himself, with occasional help from an office assistant. He cannot afford heavyweight enterprise tooling and needs a focused internal product that keeps work visible.

Raj vibe-coded an early version of the tool. It is supposed to track commercial painting opportunities from first conversation through invoice follow-up, but the current implementation has correctness, usability, and deployment issues.

## User

Primary user: Raj, owner-operator of a commercial painting business.

Secondary users:

- Office assistant who adds customer enquiries and follows up on quotes.
- Site supervisor who may update work completion status.
- Accountant or Raj himself who checks invoice status.

## User Goals

- Capture a new commercial painting lead in under one minute.
- See every active opportunity grouped by current work stage.
- Move a customer through the defined work stages without losing information.
- Know which customers need a quote, follow-up, work completion update, or invoice.
- See enough context on each customer to call them without searching through notebooks.
- Keep the tool simple enough for a non-technical small-business team.

## Current Workflow

The product currently supports, or is intended to support, these stages:

1. Lead
2. Quote sent
3. Customer closed
4. Work finished
5. Invoice sent

## Functional Requirements

- Raj can add a new customer lead with business name, phone number, site address, estimated value, and notes.
- A newly added lead appears in the Lead stage.
- Raj can move a lead forward through the stages in the correct order.
- The stage board displays accurate counts for each stage.
- Customer details persist after page refresh.
- The application prevents empty or invalid customer records.
- Estimated values are stored as numeric values and displayed as rupee amounts.
- Raj can view a basic analytics page for stage counts and opportunity value.

## Non-Functional Requirements

- The app should be usable on a laptop and a modern mobile browser.
- The UI should be simple, high-contrast, and polished.
- API errors should be visible to the user.
- Data should not be lost during ordinary app usage.
- The app must be deployable to Railway.
- The code should be understandable to another engineer reviewing a take-home submission.

## Out of Scope for the Base Fix

- Payment collection.
- WhatsApp integration.
- Full accounting system.
- Multi-tenant support.
- Role-based permissions.
