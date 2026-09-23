# Module 4: Test data

**Lab (15 min): seed every environment automatically, and prove it is safe to run twice.**

## Where we are

Your preview runs the migrations on every deploy: Flyway applies `db/migrations/V*.sql` in
order (and records what it applied in `flyway_schema_history`, so a redeploy only applies
what is new), then Django creates the framework tables it owns. So the schema is right. The
tables are empty.
Sign in and look at Employees: nothing. The end-to-end suite creates the data it needs, but a
human reviewer wants to see a populated app, and some tests need a baseline.

## Steps

0. Look at `k8s/preview/30-migrate-job.yaml` and `db/migrations/V1__initial_schema.sql`.
   Schema as code: a new column is a new `V2__...sql` file next to the code that needs it,
   applied automatically on the next deploy of that branch and nowhere else.
1. Look at `api/app/management/commands/seed_demo_data.py`. It creates a small fixed data set
   with `update_or_create`, keyed on natural identifiers (employee name, customer email,
   product name). That is what makes it idempotent: run it ten times, you get the same rows.
2. Run it locally to see what it does:
   ```bash
   docker compose exec api python manage.py seed_demo_data
   docker compose exec api python manage.py seed_demo_data   # again: same counts
   ```
3. Add it to the deploy. In `k8s/preview/30-migrate-job.yaml`, the `django` container runs
   after the Flyway init container; change its command:
   ```yaml
          args:
            - python manage.py migrate --noinput && python manage.py seed_demo_data
   ```
4. Commit and push. When the deploy finishes, open your preview: Employees, Customers,
   Products and Orders are populated.
5. Push again (an empty commit is fine: `git commit --allow-empty -m "Redeploy"`). Check the
   counts did not double. That is the property to protect.

Finished state: tag `module-04-complete`.

## Try to break it (if you have time)

Change one seeded employee's age in the UI, then redeploy. The seed overwrote your edit.
Discuss: should seed data be authoritative, or should the seed only fill gaps
(`get_or_create`)? Both are right in different contexts; the mistake is not deciding.

## What to notice

- The database is an `emptyDir`. Restart the Postgres pod and the data is gone, and the next
  deploy recreates it. For a preview, that is a feature. The migration + seed path is the
  only source of truth.
- Seed data is code, versioned with the schema on the same branch. A branch that adds a
  column adds `V<n>__...sql` and its seed values in the same PR, and its preview is the only
  place either one exists until merge.
- The e2e tests still create their own records with a unique suffix (`testId` in
  `web/tests/steps/fixtures.ts`). Seed data is for humans and for read-only checks; tests
  should not depend on a specific seeded row existing.

## Checkpoint

Preview shows seeded data; a second deploy does not duplicate it.

Stuck? `scripts/catchup.sh 4`
