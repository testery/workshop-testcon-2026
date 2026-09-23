# Database migrations (Flyway)

The application schema is owned by Flyway. Every change is a new SQL file in `migrations/`:

```
V1__initial_schema.sql
V2__customer_notes.sql        <- next change goes here, never edit an applied file
```

Naming: `V<version>__<description>.sql`. Flyway records what it applied in the
`flyway_schema_history` table, so running `migrate` twice is a no-op and a fresh database
(every preview environment) gets the whole history replayed in order.

Where it runs:

- `docker compose up` runs the `flyway` service before the API starts.
- The preview environment runs it as an init container of the `migrate-<sha>` Job
  (`k8s/preview/30-migrate-job.yaml`), from the `workshop-testcon-2026/migrations` image the
  pipeline builds from this folder.
- CI runs `flyway migrate` against a throwaway Postgres to prove the files apply cleanly.
- `pytest` applies the same files to the test database (see `api/conftest.py`).

Django still runs its own `migrate` for the framework tables it owns (sessions, admin,
auth, content types). The models in `api/app/models.py` are `managed = False`: Django reads
and writes the tables but never creates or alters them.

Run Flyway by hand against the local stack:

```bash
docker compose run --rm flyway info
docker compose run --rm flyway migrate
```
