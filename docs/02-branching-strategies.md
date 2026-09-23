# Module 2: Branching strategies

**Lab (10 min): a short-lived branch and a pull request.**

## Goal

Your own branch, one small change, one open pull request. This PR is the one you will keep
pushing to for the rest of the day, and it will grow an environment in Module 3.

## Steps

1. Create your branch from `main`. Use your name so the preview URL is easy to recognize:
   ```bash
   git checkout main && git pull
   git checkout -b <firstname>-<lastname>/workshop
   ```
   Branch names become hostnames later, so stick to letters, numbers, `-` and `/`.
2. Add yourself to `ATTENDEES.md` (one table row; keep it alphabetical).
3. Commit and push:
   ```bash
   git add ATTENDEES.md
   git commit -m "Add <your name> to attendees"
   git push -u origin HEAD
   ```
4. Open a pull request against `main` (the link in the `git push` output, or the GitHub UI).
   Title it `<your name>: workshop`.
5. Watch the **Checks** tab. `CI` runs the unit tests. `Preview Environment` builds two
   container images and then stops with a placeholder: nothing is deployed yet.

## What to notice

- The workflow that ran is the one **on your branch**, not on `main`. That is what lets
  everyone in the room evolve the pipeline on their own PR without stepping on each other.
- `main` is protected. Nobody merges today; the PR is a workspace, not a delivery.
- Look at the `Build and push images` job: the image tag is the commit SHA. Every push gets
  its own immutable images.

## Discussion

Map your team's current branching model. Where would a per-PR environment first collide
with it: long-lived release branches, a separate test repo, branch names that do not survive
becoming a hostname?

## Checkpoint

An open PR from your branch with green `CI` and a `Preview Environment` run that ends at
the "not implemented yet" step.
