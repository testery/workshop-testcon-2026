# Example Webapp

A starter project for small apps. Stack:

- **API**: Django 5 + Django REST Framework (Python 3.12), Auth0 session login
- **Web**: React 18 + Vite + TypeScript, served by nginx in prod
- **Database**: Postgres 16
- **Tests**: pytest + pytest-django (API), Playwright + playwright-bdd (web)
- **Agent runtime**: per-Session Docker containers using the persistent
  pattern from [archetype-agent-patterns](../archetype-agent-patterns/)

All three core services run as Docker containers via `docker compose`. Local
Python development uses a `venv`.

## Layout

```
api/    Django project (config/) and the single app (app/) with all entities
web/    Vite + React + TypeScript frontend
docs/   ERD and design notes
docker-compose.yml
```

## Prerequisites

- Docker Desktop
- Python 3.12
- Node 20+
- (For agent sessions) the [archetype-agent-patterns](../archetype-agent-patterns/)
  repo, with `archetype-agent-patterns:latest` image built locally
- An Auth0 application (Regular Web Application) and an Anthropic API key

## First-time setup

```bash
copy .env.example .env
# Edit .env — see "Environment variables" below

python -m venv .venv
.venv\Scripts\activate
pip install -r api\requirements-dev.txt

cd web
npm install
cd ..
```

Build the agent runtime image (once, from the sibling repo):

```bash
cd ..\archetype-agent-patterns
docker compose build
cd ..\example-webapp
```

## Environment variables

Set these in `.env`:

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SECRET_KEY` | Django secret |
| `DEBUG` | `1` enables `/api/auth/dev-login` for tests/local |
| `CORS_ALLOWED_ORIGINS` | Comma-separated origins |
| `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET` | Auth0 app credentials |
| `AUTH0_CALLBACK_URL` | Must match an Allowed Callback URL in Auth0 (default `http://localhost:8000/api/auth/callback`) |
| `POST_LOGOUT_REDIRECT` | Where Auth0 sends the user after logout (default `http://localhost:5173/`) |
| `ANTHROPIC_API_KEY` | Forwarded into each session container so the agent can call Claude |
| `AGENT_RUNNER_BACKEND` | Defaults to `app.agent_runner.DockerAgentRunner`. Set to `app.agent_runner.FakeAgentRunner` for UI dev without Docker |

In your Auth0 application settings, add:

- Allowed Callback URLs: `http://localhost:8000/api/auth/callback`
- Allowed Logout URLs: `http://localhost:5173/`
- Allowed Web Origins: `http://localhost:5173`

## Run everything with Docker

```bash
docker compose up --build
```

- Web: http://localhost:5173
- API: http://localhost:8000/api/
- Postgres: localhost:5432 (user/pass/db = `example_webapp`)

Stop and remove volumes:

```bash
docker compose down -v
```

## Local dev (venv + Vite dev server)

Run just Postgres in Docker, everything else on host:

```bash
docker compose up -d db

# API
.venv\Scripts\activate
cd api
python manage.py migrate
python manage.py runserver

# Web (in another terminal)
cd web
npm run dev
```

The Vite dev server proxies `/api` to `http://localhost:8000`, so the session
cookie is same-origin with the frontend on http://localhost:5173.

## Signing in

Either:

- Click **Sign In** in the header → redirects to Auth0 (requires the `AUTH0_*`
  env vars), or
- Visit http://localhost:5173/api/auth/dev-login once to seed a fake session
  cookie. Only works while `DEBUG=1`.

After that, refresh the page and the API calls will succeed.

## Agents and Sessions

- Create an **Agent** (name + description) on the Agents page.
- Start a **Session** by picking an agent and giving it a title. The API
  spins up a fresh Docker container running the
  [`p3_persistent`](../archetype-agent-patterns/src/patterns/p3_persistent/__main__.py)
  FastAPI service from `archetype-agent-patterns:latest`, with
  `ANTHROPIC_API_KEY` forwarded.
- You're taken to the session detail page with a chat window. Each message
  POSTs to `/api/sessions/{id}/chat/`, which forwards to the container's
  `/chat/{session_id}` endpoint and persists the user/assistant messages.
- Deleting a session stops and removes its container.

Without Docker, set `AGENT_RUNNER_BACKEND=app.agent_runner.FakeAgentRunner`
to use an in-memory echo runner — useful for frontend work.

## Run tests

```bash
.venv\Scripts\activate
cd api
pytest
```

Uses `pytest-django` with `--reuse-db`; the test DB is created in the Postgres
container. Tests autouse the `FakeAgentRunner` so no Docker is required.

```bash
pytest --cov=.
```

End-to-end (web) tests:

```bash
cd web
npm run test:e2e
```

`global-setup.ts` hits `/api/auth/dev-login` to seed a session cookie before
the suite runs.

## Useful commands

```bash
# Create a Django admin user
cd api
python manage.py createsuperuser

# Make new migrations after model changes
python manage.py makemigrations

# Tail container logs
docker compose logs -f api
docker compose logs -f web

# Rebuild a single service
docker compose build api
docker compose up -d api

# List session containers spawned by the API
docker ps --filter label=app=example-webapp-session
```

## Making this your own

1. Copy the directory, rename the root folder.
2. Rename or repurpose entities in `api/app/` (models, serializers, views,
   URLs, migrations).
3. Update `package.json` `name` and `index.html` `<title>`.
4. Generate a real `SECRET_KEY` for anything beyond local dev.
5. Point `AUTH0_*` at your own tenant.
