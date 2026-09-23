# Module 1: Introduction

**Lab (10 min): make sure everything works before we need it.**

## Goal

The app runs on your laptop (or you have confirmed you can use the cloud-only path), and you
can see the repository and the Testery workspace.

## Steps

1. Clone the repo and open it in your editor:
   ```bash
   git clone https://github.com/testery/workshop-testcon-2026.git
   cd workshop-testcon-2026
   ```
2. Start the app:
   ```bash
   docker compose up --build
   ```
   The first build takes 2 to 4 minutes. Open http://localhost:5173, click
   **Sign in as Demo User**, and look around: Dashboard, Employees, Customers, Products,
   Orders. The API is at http://localhost:8000/api/ and health at
   http://localhost:8000/api/health/.
3. Run the API unit tests in the container:
   ```bash
   docker compose exec api sh -c "pip install -q -r requirements-dev.txt && pytest -q"
   ```
4. Sign in at https://app.testery.io and confirm you see the **TestCon 2026 Workshop**
   workspace.

**No Docker?** Skip steps 2 and 3. Everything from Module 3 onward runs in GitHub Actions
and the cloud; you will use the preview URL instead of localhost.

## What to notice

- `api/` and `web/` each have a Dockerfile. The pipeline builds exactly these images.
- `docker-compose.yml` runs Flyway (`db/migrations`), then Django's own framework
  migrations and the seed data, before starting the API. Keep that in mind for Module 4: a
  Kubernetes deployment has to do the same thing somewhere.
- `web/tests/features/` holds the end-to-end suite. It talks to the app the way a user does.

## Checkpoint

You can sign in at http://localhost:5173 (or you have chosen the cloud-only path) and you
have access to the repo and the Testery workspace.
