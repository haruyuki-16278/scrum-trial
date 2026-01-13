# Scrum Golden Test

This directory contains an End-to-End (E2E) test for the Scrum Experience using Playwright.

## Prerequisites

- Node.js installed
- The Scrum Trial App server running on port 8001 (default `deno task dev`)

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Playwright browsers:
   ```bash
   npx playwright install chromium
   ```

## Running the Test

Run the test suite:

```bash
npx playwright test
```

To see the visual report:

```bash
npx playwright show-report
```

## Scenario

The test `scrum.spec.ts` simulates a full sprint cycle with two users ("Scrum Master A" and "Developer B"):
1. **Session Setup**: User A creates a session; User B joins it.
2. **Planning**: User A adds a task and moves it to Sprint Backlog.
3. **Sprint**: 
    - Phase advances to Sprint.
    - User B picks the task and sees assignment update.
    - Synchronization is verified on User A's screen.
4. **Completion**: User B completes the task.
5. **KPT**: User A types in Shared Notes; User B sees the update.
6. **Progression**: Days are advanced (1->4) -> Review -> Retrospective.
7. **Retrospective**: User A (SM) rolls for improvement.
8. **Next Sprint**: System resets for next sprint.
