# Workshop app: notes for Claude Code

This is the sample app for the TestCon 2026 workshop "Deploying and Testing Ephemeral
Environments". Keep changes small and complete: model, API, UI, and a BDD scenario for
every feature, in one branch, one pull request.

## Stack
- API: Django 5 + Django REST Framework, Python 3.12, Postgres. One Django app at `api/app/`
  holds every entity (`Item`, `Employee`, `Customer`, `CustomerProfile`, `Product`, `Order`,
  `OrderItem`, `Action`, `AuditEvent`). New entities and fields go in `api/app/models.py`
  with a migration in `api/app/migrations/`. ViewSets in `api/app/views.py` are registered in
  `api/app/urls.py`; all of them go through `AuditedViewSetMixin`, which records changes.
- Web: React 18 + TypeScript + Vite in `web/`. One page component per entity
  (`web/src/CustomersPage.tsx` etc.), one API client module per entity
  (`web/src/commerceApi.ts`, `web/src/employeesApi.ts`, `web/src/api.ts`). Inline styles,
  no CSS framework. Icons are Font Awesome 6 classes.
- Auth: a demo session. `GET /api/auth/demo-login` signs the browser in. There is no
  password and no user management; do not add any.
- Tests: `pytest` in `api/` (needs Postgres, see `docker-compose.yml`), `vitest` for web unit
  tests, Playwright + playwright-bdd for end-to-end tests in `web/tests/features/*.feature`
  with steps in `web/tests/steps/*.steps.ts`.

## Commands
```bash
docker compose up --build            # full stack on http://localhost:5173
cd api && pytest                     # API unit tests
cd web && npm test                   # web unit tests
cd web && npm run test:e2e           # e2e against http://localhost:5173 (or $BASE_URL)
python manage.py makemigrations      # run inside api/ with the venv or the api container
python manage.py seed_demo_data      # idempotent demo data
```

## Definition of done for a feature
1. Model change + migration (`python manage.py makemigrations app`), serializer updated.
2. API client type and function updated in `web/src/*Api.ts`.
3. UI: the page shows and edits the new data. Reuse the existing table/form pattern on the
   page you are changing.
4. A new scenario in the matching `.feature` file plus any missing step definitions. Follow the
   existing steps: the `testId` fixture makes names unique so tests can run in parallel and
   against a shared environment. Never hardcode a base URL or an id from seed data.
5. `pytest`, `npm test` and `npm run test:e2e` pass locally.
6. Commit on the current branch and push. The pull request deploys a preview environment and
   runs the e2e suite on Testery; read the PR checks before calling it done.

## Conventions
- Serializers list fields explicitly. Add new fields to `fields` and, when read-only, to
  `read_only_fields`.
- Playwright locators: prefer `getByRole`, `getByLabel` and `getByTestId`. Add a `data-testid`
  when there is no accessible name to hook on.
- Keep pull requests to one feature. Do not refactor unrelated code.
