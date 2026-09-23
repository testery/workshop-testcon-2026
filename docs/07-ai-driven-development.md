# Module 7: AI-driven development

**Lab (15 min): Claude Code builds a feature; the pipeline you built proves it.**

## Where we are

Every push to your PR builds, deploys, seeds, and runs the suite on Testery. Now hand the
keyboard to an AI and see why all of that matters.

## The feature

Customers need a free-text **Notes** field: stored on the customer, editable in the
Customers page, shown in the table, covered by an end-to-end scenario.

## Steps

1. On your branch, in the repo root, start Claude Code:
   ```bash
   claude
   ```
2. Give it the task. Paste this:
   ```
   Add a "notes" text field to Customer. It is optional. The schema change is a new Flyway
   migration in db/migrations. Show it in the Customers table and make it editable in the
   add/edit form. Add a BDD scenario in web/tests/features/commerce.feature that adds a
   customer with notes and checks the notes appear in the table. Follow CLAUDE.md, run
   pytest and npm run test:e2e locally, then commit on this branch and push.
   ```
3. Watch what it does: `V2__customer_notes.sql`, model, serializer, API client, page, feature file, steps,
   runs the tests locally, commits, pushes. Answer its questions if it asks; say yes to running
   the tests.
4. The push triggers the pipeline. Open the PR: images build, the preview redeploys with the
   new migration, seed runs, the suite runs on Testery with the new scenario in it.
5. Open your preview URL. Is the Notes column there? Add a note. Did the AI build what you
   asked for? You are looking at the running feature, not a diff.
6. If the Testery run is red, do not read the failure yourself. Tell Claude:
   ```
   The Testery E2E check on my PR failed. Use the Testery plugin to look at the failed run,
   work out the root cause, fix it, and push.
   ```
   (Install the plugin first if you have not: `/plugin marketplace add testery/claude-plugin`
   then `/plugin install testery@testery`.)

Finished state: tag `module-07-complete` (the feature implemented by Claude Code, cleaned up).

No Claude Code? Follow along on the projector, then `scripts/catchup.sh 7` to get the
feature on your branch and watch your own pipeline verify it.

## What to notice

- The AI did the boring, correct thing because `CLAUDE.md` told it what "done" means here.
  Write that file for your own repos.
- Nothing about the pipeline changed for Module 7. The gate does not care who wrote the code.
- The loop is: describe, AI implements, deploy to an ephemeral environment, run the suite,
  feed the results back, AI fixes, repeat. A human reviews the running feature and the PR,
  not every line the AI typed.
- Volume is the new risk. An AI can open ten PRs before lunch. Ten previews and ten test runs
  in parallel is exactly what this setup is for.

## Your action plan

Write down one thing you will change in the first week back. Then the thing after that.
Pick the smallest one that removes a manual step from your merge path.

## Checkpoint

Your PR has the Notes feature, deployed, with a green `Testery E2E` check that includes the
new scenario.
