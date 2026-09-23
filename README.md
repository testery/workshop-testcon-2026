# Deploying and Testing Ephemeral Environments

Hands-on workshop, TestCon Europe 2026, Vilnius, 20 October. Trainer: Chris Harbert (Testery).

By the end of the day every pull request you open in this repo will build container images,
deploy its own environment on Kubernetes at `https://<your-branch>.testcon.testery.academy`,
run the end-to-end suite against it on Testery, report back to the PR, and tear itself down
when the PR closes. In the last module Claude Code builds a feature and you watch the
pipeline prove it works before anyone merges it.

## Before you arrive

Read [docs/00-prerequisites.md](docs/00-prerequisites.md). The short version: a GitHub
account, Git, and a browser. Docker Desktop and Node 20+ let you run things locally and are
strongly recommended. Claude Code (with a Claude subscription or API key) is needed to do
Module 7 yourself rather than watch.

## The app

A small Django + React app with employees, customers, products and orders. Postgres behind
it, Flyway owning the schema, Playwright + playwright-bdd on top of it.

```
api/    Django 5 + DRF (Python 3.12); the models are unmanaged, the schema lives in db/
db/     Flyway SQL migrations (V1__..., V2__...) and the image that ships them
web/    React 18 + Vite + TypeScript, served by nginx in containers
k8s/    Kubernetes manifests for a preview environment (Module 3)
.github/workflows/  CI and the preview pipeline
docs/   One lab per module
```

Run it locally:

```bash
docker compose up --build
```

Then open http://localhost:5173 and click **Sign in as Demo User**. The API is at
http://localhost:8000/api/ and http://localhost:8000/api/health/.

Already have something on port 5432? `DB_PORT=5433 docker compose up --build`
(PowerShell: `$env:DB_PORT=5433; docker compose up --build`).

Run the tests:

```bash
# API unit tests (needs a Postgres on localhost:5432, e.g. docker compose up -d db)
cd api && pip install -r requirements-dev.txt && pytest

# End-to-end tests (against the docker compose stack above)
cd web && npm install && npx playwright install chromium && npm run test:e2e
```

## Modules

| # | Module | Lab | Docs |
| --- | --- | --- | --- |
| 1 | Introduction | Get the app running, open the repo | [01](docs/01-introduction.md) |
| 2 | Branching strategies | Your branch, your first pull request | [02](docs/02-branching-strategies.md) |
| 3 | Deploying ephemeral environments | Deploy every PR to Kubernetes, tear it down on close | [03](docs/03-deploying-ephemeral-environments.md) |
| 4 | Test data | Migrate and seed on every deploy | [04](docs/04-test-data.md) |
| 5 | Creating automated tests | Tests that run anywhere | [05](docs/05-creating-automated-tests.md) |
| 6 | Adding tests to CI/CD | Run the suite on Testery from the pipeline | [06](docs/06-adding-tests-to-ci-cd.md) |
| 7 | AI-driven development | Claude Code ships a feature through the whole loop | [07](docs/07-ai-driven-development.md) |

## If you get stuck

Every module has a finished state tagged `module-0N-complete`. To jump your branch there:

```bash
scripts/catchup.sh 3        # macOS / Linux / Git Bash
.\scripts\catchup.ps1 3      # PowerShell
```

It resets your branch to the tag and force-pushes it, so your open PR redeploys from the
known-good state. You lose your own edits on that branch; that is the point.

## Ground rules

- Work on your own branch. `main` is protected and nobody merges to it today.
- The Kubernetes cluster, the AWS account and the Testery workspace are shared. Be kind.
- Environments are deleted automatically when a PR closes and swept every hour after 24h.

## Keeping the app in sync with the upstream example

This repo started from [testery/example-webapp](https://github.com/testery/example-webapp).
GitHub does not allow forks inside the same organization, so it is a copy with an `upstream`
remote instead:

```bash
git remote add upstream https://github.com/testery/example-webapp.git
git fetch upstream
git merge upstream/main
```
