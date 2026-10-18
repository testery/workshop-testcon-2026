# TestCon 2026 Workshop: Lab Steps

> [!NOTE]
> Copy-paste steps for every lab, in workshop order. Every code block has a copy button (top right). Read this page on GitHub on the `main` branch: catch-up resets your branch to a module tag, and the tags don't include this file. Last updated 2026-10-18.

Every lab for *Deploying and Testing Ephemeral Environments*, in order. Copy each code block whole. Run commands from the **repo root** unless a step says otherwise. Commands work in both **PowerShell** and **bash** (macOS, Linux, Git Bash) unless a step shows two versions. `code <file>` opens the file in VS Code; any editor is fine.

- Repo: https://github.com/testery/workshop-testcon-2026
- Workshop home: https://testcon.testery.academy
- Testery: https://testery.app
- If you get stuck, every lab has a catch-up command that resets your branch to that lab's finished state.

---

## Set your name (every new terminal)

Use your first and last name, lowercase, joined with a hyphen (letters, digits and hyphens only). This becomes your branch name and your preview URL. Set it again whenever you open a new terminal.

PowerShell:

```powershell
$ME = "jane-doe"
```

bash:

```bash
ME=jane-doe
```

---

## Module 1: Introduction (09:30–10:25) · Lab 1 at ~10:10

> [!TIP]
> **Checkpoint**
>
> The app runs at http://localhost:5173 (or you've chosen the cloud-only path), and you can see the repo and the Testery workspace.

1. Clone the repo and open it. You'll use this clone all day.

```powershell
git clone https://github.com/testery/workshop-testcon-2026.git; cd workshop-testcon-2026; code .
```

2. Start the app. The first build takes 2–4 minutes; do step 3 while it runs.

```powershell
docker compose up --build
```

If port 5432 is already in use, start it on 5433 instead. PowerShell:

```powershell
$env:DB_PORT=5433; docker compose up --build
```

bash:

```bash
DB_PORT=5433 docker compose up --build
```

Expected: Flyway applies V1 and exits, the api logs `Seeded 5 employees, 3 customers, 4 products, 2 orders`, and gunicorn shows `Listening at: http://0.0.0.0:8000`.

3. Sign in at https://testery.app and confirm you can see the **TestCon 2026 Workshop** workspace.

4. Open http://localhost:5173 and click **Sign in as Demo User**. Look around Dashboard, Employees, Customers, Products and Orders. Then open http://localhost:8000/api/health/; it should show `status ok`, `database ok`.

5. In a second terminal at the repo root, run the API unit tests. Expect about 56 passed.

```powershell
docker compose exec api sh -c "pip install -q -r requirements-dev.txt && pytest -q"
```

6. Leave the app running. You'll use it again in Modules 4 and 7.

**No Docker?** Skip steps 2, 4 and 5. Everything from Module 3 on runs in GitHub Actions, and you'll use your preview URL instead of localhost.

**If it breaks:**

- "Cannot connect to the Docker daemon": start Docker Desktop and wait for "Engine running".
- `git clone` says "Repository not found": accept your GitHub invite at https://github.com/testery/workshop-testcon-2026/invitations.
- Port 8000 or 5173 is in use: find what's holding it with `docker ps` and stop it.

---

## Module 2: Branching Strategies (10:25–10:55) · Lab 2 at ~10:43

> [!TIP]
> **Checkpoint**
>
> An open PR from your branch, with green CI and a Preview Environment run that ends at "Deploy (not implemented yet)".

1. Update main and create your branch. Make sure `$ME` is set first (see Set your name).

```powershell
git checkout main; git pull; git checkout -b "${ME}/workshop"
```

2. Add yourself to `ATTENDEES.md`. Paste this as one new table row, in alphabetical order by first name, then fill in your details:

```powershell
code ATTENDEES.md
```

```
| Jane Doe | Your Company | Where you are with ephemeral environments today |
```

3. Commit and push:

```powershell
git add ATTENDEES.md; git commit -m "Add ${ME} to attendees"; git push -u origin HEAD
```

4. Open a pull request against `main` titled `<your name>: workshop`. Either click the link in the push output, or use the GitHub CLI:

```powershell
gh pr create --base main --title "${ME}: workshop" --body "Workshop PR"
```

5. Watch the checks on the PR's **Checks** tab, or in the terminal:

```powershell
gh pr checks --watch
```

Expected: **CI** has 3 green jobs. **Preview Environment** builds 3 images, then stops at "Deploy (not implemented yet)".

6. Open the Preview Environment run → **Build and push images** → **Work out the environment name**. It shows your preview URL: `https://<your-name>-workshop.testcon.testery.academy`.

**If it breaks:**

- `git commit` says "Please tell me who you are": run `git config --global user.name "First Last"` and `git config --global user.email "you@example.com"`, then commit again.
- A push to `main` is rejected: that's expected, because main is protected. Run `git checkout -b "${ME}/workshop"`, then `git push -u origin HEAD`.
- PowerShell says `&&` is not a valid statement separator: use `;` instead.
- The PR comes from a fork: forks get no secrets. Push your branch to `testery/workshop-testcon-2026` itself.

---

## Module 3: Deploying Ephemeral Environments (11:20–13:00)

### Lab 3a: deploy on every push (~12:15, 15 min)

> [!TIP]
> **Checkpoint**
>
> Your PR has a preview comment with a working URL, and you can sign in. The pages stay empty until Module 4.

1. Switch to your workshop branch and confirm it. (This is the step people skip.)

```powershell
git switch "${ME}/workshop"; git pull; git branch --show-current
```

2. Open the workflow:

```powershell
code .github/workflows/preview-deploy.yml
```

3. Select from **line 97** (the `# ----` line above `LAB 3a`) to the **end of the file**. That's the placeholder step. Keep `- uses: actions/checkout@v4` on line 95. Paste this block over the selection. Each `- name:` sits at **6 spaces**, level with `- uses: actions/checkout@v4`.

```yaml
      - name: Authenticate to AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Point kubectl at the cluster
        run: aws eks update-kubeconfig --name "$EKS_CLUSTER" --region "$AWS_REGION"

      - name: Create or update the environment
        env:
          NAMESPACE: ${{ needs.build.outputs.namespace }}
          HOST: ${{ needs.build.outputs.host }}
          API_IMAGE: ${{ needs.build.outputs.api_image }}
          WEB_IMAGE: ${{ needs.build.outputs.web_image }}
          MIGRATIONS_IMAGE: ${{ needs.build.outputs.migrations_image }}
          GIT_SHA_SHORT: ${{ needs.build.outputs.sha_short }}
          PR_NUMBER: ${{ github.event.pull_request.number }}
          BRANCH: ${{ github.head_ref }}
          CERT_ARN: ${{ vars.PREVIEW_CERT_ARN }}
        run: |
          # envsubst fills in the ${...} placeholders; kubectl apply is idempotent, so the
          # same command creates the environment the first time and updates it after that.
          for f in k8s/preview/*.yaml; do envsubst < "$f"; echo "---"; done | kubectl apply -f -

      - name: Wait for the database migration
        run: kubectl -n "${{ needs.build.outputs.namespace }}" wait --for=condition=complete --timeout=600s "job/migrate-${{ needs.build.outputs.sha_short }}"

      - name: Wait for the rollout
        run: |
          kubectl -n "${{ needs.build.outputs.namespace }}" rollout status deploy/api --timeout=600s
          kubectl -n "${{ needs.build.outputs.namespace }}" rollout status deploy/web --timeout=600s

      - name: Wait until the URL answers
        env:
          HOST: ${{ needs.build.outputs.host }}
        run: |
          for i in $(seq 1 60); do
            code=$(curl -s -o /dev/null -w '%{http_code}' "https://$HOST/api/health/" || true)
            if [ "$code" = "200" ]; then echo "https://$HOST is up"; exit 0; fi
            echo "attempt $i: HTTP $code, waiting for the load balancer rule and DNS..."; sleep 10
          done
          echo "Preview never became healthy"; exit 1

      - name: Post the URL on the pull request
        uses: marocchino/sticky-pull-request-comment@v2
        with:
          header: preview
          message: |
            ### Preview environment
            :rocket: **https://${{ needs.build.outputs.host }}**

            Namespace `${{ needs.build.outputs.namespace }}` on `${{ env.EKS_CLUSTER }}`, built from `${{ needs.build.outputs.sha_short }}`.
            It is redeployed on every push and deleted when this PR is closed.
```

4. Compare your file with the finished version. **No output means it's identical.**

```powershell
git fetch origin --tags; git diff module-03-complete -- .github/workflows/preview-deploy.yml
```

If the file is a mess, take the finished version: `git checkout module-03-complete -- .github/workflows/preview-deploy.yml`

5. Commit and push:

```powershell
git add .github/workflows/preview-deploy.yml
git commit -m "Lab 3a: deploy the preview environment on every push"
git push
```

6. Watch the run. The first deploy takes 3–5 minutes.

```powershell
gh pr checks --watch
```

7. When the **Preview environment** comment appears on your PR, open its URL and click **Sign in as Demo User**. The URL is `https://<your-name>-workshop.testcon.testery.academy`. That's your environment.

**Catch-up** (from your own branch, not main). This replaces your branch with the finished Lab 3 state. PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\catchup.ps1 3
```

bash:

```bash
bash scripts/catchup.sh 3
```

### Lab 3b: tear it down (~12:40, 10 min)

> [!TIP]
> **Checkpoint**
>
> Your throwaway PR's environment was deleted when you closed it, and your workshop PR still has a working preview.

1. Make sure you're on your workshop branch:

```powershell
git switch "${ME}/workshop"; git pull
```

2. Create the teardown workflow:

```powershell
code .github/workflows/preview-destroy.yml
```

3. Paste this as the whole file:

```yaml
name: Preview Environment Teardown

on:
  pull_request:
    types: [closed]

permissions:
  contents: read
  id-token: write

env:
  AWS_REGION: us-east-1
  EKS_CLUSTER: ${{ vars.EKS_CLUSTER }}
  NAMESPACE: pr-${{ github.event.pull_request.number }}

jobs:
  destroy:
    name: Delete the preview environment
    runs-on: ubuntu-24.04
    steps:
      - name: Authenticate to AWS
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ vars.AWS_ROLE_ARN }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Point kubectl at the cluster
        run: aws eks update-kubeconfig --name "$EKS_CLUSTER" --region "$AWS_REGION"

      - name: Delete the namespace
        run: kubectl delete namespace "$NAMESPACE" --ignore-not-found --timeout=300s
```

4. Commit and push. The diff should be empty. Your workshop PR redeploys, and its comment updates in place.

```powershell
git add .github/workflows/preview-destroy.yml
git diff --cached module-03-complete -- .github/workflows/preview-destroy.yml
git commit -m "Lab 3b: delete the preview environment when the PR closes"
git push
```

5. Create a throwaway branch **from your workshop branch** and push it:

```powershell
git switch -c "${ME}/throwaway"; git push -u origin HEAD
```

6. Open a PR for the throwaway branch (with the link in the push output, or the CLI):

```powershell
gh pr create --base main --title "${ME}: throwaway" --body "Lab 3b: close me to watch the teardown."
```

7. **Wait for the throwaway PR's preview comment** (about 5 minutes) and open its URL once. Don't close the PR before the comment appears, or the deploy can recreate what the teardown deletes.

8. Close the throwaway PR (the **Close pull request** button, or the CLI). Watch the Actions tab: **Preview Environment Teardown** deletes the environment in about 40 s, and the throwaway URL stops working.

```powershell
gh pr close "${ME}/throwaway"
```

9. Delete the throwaway branch and go back to your workshop branch:

```powershell
git switch "${ME}/workshop"
git push origin --delete "${ME}/throwaway"
git branch -D "${ME}/throwaway"
```

**If it breaks:**

- The run fails in 0 s with "workflow file issue": the indentation is wrong. Every `- name:` needs 6 spaces.
- "no objects passed to apply": you deleted the checkout step. Put `- uses: actions/checkout@v4` back.
- The throwaway shows "Deploy (not implemented yet)": it was branched from main instead of your workshop branch.
- A run shows "cancelled": you pushed again. Watch the newest run.

---

## Module 4: Test Data (14:00–14:50) · Lab 4a at ~14:31, Lab 4b at ~14:40

### Lab 4a: seed data on every deploy (~14:31, 9 min)

> [!TIP]
> **Checkpoint**
>
> Your preview shows 5 employees, 3 customers, 4 products and 2 orders, and a second deploy doesn't duplicate them.

1. Open your preview and sign in. The Dashboard shows Employees **0**. The schema is there, but the tables are empty.

2. Make sure you're on your branch with a clean tree:

```powershell
git switch "${ME}/workshop"; git status -sb; git fetch origin --tags
```

3. Look at the Job and the seed command side by side. The seed uses `update_or_create`, keyed on names and email.

```powershell
code k8s/preview/30-migrate-job.yaml api/app/management/commands/seed_demo_data.py
```

4. Docker path only: run the seed locally twice. You get the same counts both times.

```powershell
docker compose exec api python manage.py seed_demo_data
docker compose exec api python manage.py seed_demo_data
```

5. In `k8s/preview/30-migrate-job.yaml`, put the cursor at the **end of line 39** (`- python manage.py migrate --noinput`) and paste this onto the same line. It must stay **one** list item joined with `&&`, not a second `-` line.

```
 && python manage.py seed_demo_data
```

Line 39 now reads `- python manage.py migrate --noinput && python manage.py seed_demo_data`, with the same indentation as before.

6. Check your edit. Empty output means done; a difference in the comment on line 6 only is fine.

```powershell
git diff module-04-complete -- k8s/preview/30-migrate-job.yaml
```

7. Commit, push, and watch. It takes about 4 minutes.

```powershell
git add k8s/preview/30-migrate-job.yaml
git commit -m "Seed demo data on every deploy"
git push
gh pr checks --watch
```

8. Refresh your preview. Employees 5 (Ada Lovelace, Grace Hopper, …), Customers 3, Products 4 and Orders 2.

9. **After that run has fully finished**, redeploy with an empty commit:

```powershell
git commit --allow-empty -m "Redeploy"; git push; gh pr checks --watch
```

10. Refresh again. The counts haven't doubled. That's the property to protect.

11. Optional, if you have time: in the preview, edit Ada Lovelace's age to 99 and save. Then redeploy:

```powershell
git commit --allow-empty -m "Redeploy again"; git push
```

Ada is back to 36. Discuss: should seed data be authoritative, or only fill gaps?

**Catch-up.** PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\catchup.ps1 4
```

bash:

```bash
bash scripts/catchup.sh 4
```

**If it breaks:**

- The deploy is green but the tables are empty: the seed was added as its own `-` item. Join it to the migrate line with `&&`.
- "error converting YAML": the indentation under `args:` broke. Compare with `git diff module-04-complete`.
- `MultipleObjectsReturned`: someone created a second "Ada Lovelace" in the UI. Delete it and redeploy.

### Lab 4b: watch Flyway apply a migration (~14:40, 6 min, while the Lab 4a redeploy runs)

> [!TIP]
> **Checkpoint**
>
> You've seen Flyway apply a new migration once, skip it on the next run, and refuse to run after you edited it. You deleted the practice file and your local database is back to V1 with the demo data.

Seed data fills the tables. The tables themselves come from **Flyway**: every schema change is a numbered SQL file in `db/migrations`, and Flyway records each one it applies in a `flyway_schema_history` table. The `flyway` init container in `k8s/preview/30-migrate-job.yaml` runs `migrate` on every deploy, and it only applies what's new. This lab runs the same Flyway image against your **local** database, so you can watch it in seconds instead of waiting for a deploy.

> [!WARNING]
> **Docker path only, and local only**
>
> Nothing in this lab is committed or pushed. Module 7 adds the real `V2` migration, so the practice file must be deleted at the end (step 9). No Docker? Follow along on the projector.

1. Make sure the local stack is up, then ask Flyway what it has applied. You should see one row: version **1**, *initial schema*, state **Success**. A `WARNING: Storing migrations in 'sql' is not recommended` line is normal; ignore it.

```powershell
docker compose up -d
docker compose run --rm --build flyway info
```

2. Look at the record Flyway keeps inside the database. The checksum is a fingerprint of the file's contents.

```powershell
docker compose exec db psql -U example_webapp -d example_webapp -c "SELECT installed_rank, version, description, checksum, success FROM flyway_schema_history"
```

3. Create a new migration. The name is the whole contract: `V2` is the version, and the text after the double underscore is the description.

```powershell
code db/migrations/V2__add_product_sku.sql
```

Paste this as the whole file and save:

```sql
-- Lab 4b: a practice migration. You delete it at the end of the lab.
ALTER TABLE app_product ADD COLUMN sku varchar(40);
```

4. Ask Flyway again. Version 2 now shows as **Pending**. `--build` matters: the migrations ship inside the Flyway image, the same way the pipeline builds the `migrations` image for your preview.

```powershell
docker compose run --rm --build flyway info
```

5. Apply it. Expect `Migrating schema "public" to version "2 - add product sku"` and `Successfully applied 1 migration`.

```powershell
docker compose run --rm --build flyway migrate
```

6. Check the table. `sku` is now the last column of `app_product`.

```powershell
docker compose exec db psql -U example_webapp -d example_webapp -c "\d app_product"
```

7. Run `migrate` again. Expect `Schema "public" is up to date. No migration necessary.` That's why the migrate Job can safely run on every deploy.

```powershell
docker compose run --rm --build flyway migrate
```

8. Now break the rule. In `V2__add_product_sku.sql`, change `varchar(40)` to `varchar(64)`, save, and migrate again.

```powershell
docker compose run --rm --build flyway migrate
```

Flyway refuses: `Validate failed` … `Migration checksum mismatch for migration version 2`. The database already ran the old file, and Flyway won't pretend otherwise. **Never edit a migration that has been applied. Write the next one** (`V3__…`).

9. Clean up. Delete the practice file, then throw the local database away and rebuild it. A fresh database replays every migration in order and the seed runs again. That's exactly what happens in every new preview environment.

```powershell
rm db/migrations/V2__add_product_sku.sql
docker compose down -v
docker compose up -d --build
```

10. Confirm you're back where you started. `git status` prints nothing, and `info` shows only version 1 again.

```powershell
git status --short
docker compose run --rm --build flyway info
```

Refresh http://localhost:5173: the demo data is back (Employees 5).

**If it breaks:**

- `info` doesn't show version 2: you left off `--build`, so Flyway ran the old image. Run the command again with `--build`.
- `Found more than one migration with version 2`: there's a second `V2__*.sql` in `db/migrations`. Keep only `V1__initial_schema.sql` and your practice file.
- `port is already allocated` on 5432: another Postgres is using the port. Set `DB_PORT` (PowerShell `$env:DB_PORT=5433`, bash `export DB_PORT=5433`) and run the command again.
- You committed or pushed the practice file: `git rm db/migrations/V2__add_product_sku.sql`, commit and push, then tell the trainer. Your preview database needs a reset before Module 7.

---

## Module 5: Creating Automated Tests (14:50–15:30) · Lab 5 at ~15:13

> [!TIP]
> **Checkpoint**
>
> The e2e suite passes against your preview URL from your laptop, and the config is pushed.

1. Start from a clean tree:

```powershell
git switch "${ME}/workshop"; git status -sb; git fetch origin --tags
```

2. Open the Playwright config. Line 14 hard-codes `localhost`, and lines 25–29 always start a dev server.

```powershell
code web/playwright.config.ts
```

3. **Replace the whole file** with this (select all, paste):

```ts
import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "tests/features/**/*.feature",
  steps: "tests/steps/**/*.ts",
});

// The suite does not know where it is running. BASE_URL points it at a local stack, a
// preview environment, staging, anywhere. When it is unset we fall back to localhost and
// start the Vite dev server ourselves.
const baseURL = process.env.BASE_URL ?? "http://localhost:5173";
const isLocal = !process.env.BASE_URL;

export default defineConfig({
  testDir,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./tests/global-setup.ts",
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
    storageState: "tests/.auth/storage.json",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: isLocal
    ? {
        command: "npm run dev",
        url: "http://localhost:5173",
        reuseExistingServer: !process.env.CI,
      }
    : undefined,
});
```

4. Open the global setup:

```powershell
code web/tests/global-setup.ts
```

5. **Replace the whole file** with this version, which adds a readiness gate:

```ts
import { chromium, type FullConfig } from "@playwright/test";

// Readiness gate: a freshly deployed environment can answer 502/503 for a little while.
// Poll the health endpoint instead of sleeping for an arbitrary number of seconds.
async function waitForHealthy(baseURL: string, attempts = 30, delayMs = 5000) {
  for (let i = 1; i <= attempts; i++) {
    try {
      const res = await fetch(`${baseURL}/api/health/`);
      if (res.ok) return;
      console.log(`health check ${i}/${attempts}: HTTP ${res.status}`);
    } catch (e) {
      console.log(`health check ${i}/${attempts}: ${String(e)}`);
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`${baseURL} did not become healthy`);
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:5173";
  await waitForHealthy(baseURL);

  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const resp = await page.request.get(`${baseURL}/api/auth/demo-login`);
  if (!resp.ok()) {
    throw new Error(`demo-login failed: ${resp.status()} - is the app running at ${baseURL}?`);
  }
  await context.storageState({ path: "tests/.auth/storage.json" });
  await browser.close();
}
```

6. Check both files against the finished version. Empty output means done.

```powershell
git diff module-05-complete -- web
```

7. Install the test dependencies. The Chromium download is slow on conference wi-fi.

```powershell
cd web; npm install; npx playwright install chromium
```

8. Run the suite against **your preview** from `web/`. PowerShell:

```powershell
$env:BASE_URL = "https://${ME}-workshop.testcon.testery.academy"; npm run test:e2e
```

bash:

```bash
BASE_URL="https://${ME}-workshop.testcon.testery.academy" npm run test:e2e
```

Expected: `Running 18 tests`, then `18 passed`. If your preview URL looks different, copy it from your PR comment (without a trailing slash).

9. Open the report, then press Ctrl+C when you're done:

```powershell
npx playwright show-report
```

10. Go back to the repo root, then commit and push the two files:

```powershell
cd ..
git add web/playwright.config.ts web/tests/global-setup.ts
git commit -m "Run the e2e suite against any URL, with a readiness gate"
git push
```

11. PowerShell only: clear the variable so later local runs don't quietly hit your preview.

```powershell
Remove-Item Env:BASE_URL
```

**Catch-up.** PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\catchup.ps1 5
```

bash:

```bash
bash scripts/catchup.sh 5
```

After catching up, run steps 7–9.

**If it breaks:**

- `BASE_URL=... is not recognized` in PowerShell: that's the bash form. Use the PowerShell line.
- The tests start a dev server or hit localhost: `BASE_URL` isn't set in this terminal.
- `demo-login failed: 404`, or health checks repeating: the URL is wrong or the preview is still deploying. Check your PR comment.
- "Executable doesn't exist": run `npx playwright install chromium` from `web/`.
- `fetch is not defined`: you need Node 20 or newer.
- Port 9323 is in use: run `npx playwright show-report --port 9324`.

---

## Module 6: Adding Tests to CI/CD (15:55–16:40) · Lab 6 at ~16:25

> [!TIP]
> **Checkpoint**
>
> Your PR shows a green **End-to-end tests on Testery** check (18 of 18), and the run is visible in Testery under Test Runs.

1. Start from your Lab 5 state:

```powershell
git switch "${ME}/workshop"; git pull; git fetch origin --tags
```

2. Open the deploy workflow. Go to the **very end** of the file (after the line `It is redeployed on every push…`), add one empty line, put the cursor at **column 0**, and paste the block below. `e2e:` lines up with `deploy:` at 2 spaces.

```powershell
code .github/workflows/preview-deploy.yml
```

```yaml
  e2e:
    name: End-to-end tests on Testery
    needs: [build, deploy]
    runs-on: ubuntu-24.04
    env:
      TESTERY_TOKEN: ${{ secrets.TESTERY_TOKEN }}
      TESTERY_PROJECT: ${{ vars.TESTERY_PROJECT_KEY }}
      ENV_KEY: ${{ needs.build.outputs.namespace }}
      HOST: ${{ needs.build.outputs.host }}
      BUILD_ID: ${{ needs.build.outputs.sha_short }}
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-python@v5
        with:
          python-version: "3.12"

      - name: Install the Testery CLI
        run: pip install --quiet --upgrade testery

      - name: Register this preview as a Testery environment
        run: |
          testery create-environment --token "$TESTERY_TOKEN" --key "$ENV_KEY" \
            --name "PR #${{ github.event.pull_request.number }} ${{ github.head_ref }}" \
            --variable "BASE_URL=https://$HOST" --ignore-already-exists-error
          testery update-environment --token "$TESTERY_TOKEN" --key "$ENV_KEY" \
            --name "PR #${{ github.event.pull_request.number }} ${{ github.head_ref }}" \
            --variable "BASE_URL=https://$HOST"

      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: web/package-lock.json

      - name: Generate the specs and upload this commit's tests
        run: |
          # playwright-bdd turns .feature files into Playwright specs (.features-gen); ship them with the bundle
          (cd web && npm ci && npx bddgen)
          (cd web && zip -qr ../tests.zip . -x 'node_modules/*' 'test-results/*' 'playwright-report/*' 'dist/*' 'tests/.auth/*')
          testery upload-build-artifacts --token "$TESTERY_TOKEN" --project-key "$TESTERY_PROJECT" \
            --build-id "$BUILD_ID" --branch "${{ github.head_ref }}" --path tests.zip

      - name: Run the suite against the preview
        run: |
          testery create-test-run --token "$TESTERY_TOKEN" --project-key "$TESTERY_PROJECT" \
            --environment-key "$ENV_KEY" --build-id "$BUILD_ID" \
            --git-ref "${{ github.event.pull_request.head.sha }}" --git-branch "${{ github.head_ref }}" \
            --status-name "Testery E2E" --wait-for-results --fail-on-failure --output pretty
```

3. Open the teardown workflow. After the last step (**Delete the namespace**), add an empty line and paste this at 6 spaces:

```powershell
code .github/workflows/preview-destroy.yml
```

```yaml
      - name: Remove the Testery environment
        continue-on-error: true
        run: |
          pip install --quiet --upgrade testery
          testery delete-environment --token "${{ secrets.TESTERY_TOKEN }}" --key "$NAMESPACE"
```

4. Compare with the finished version. Only comment, echo or message lines may differ.

```powershell
git diff --ignore-blank-lines module-06-complete -- .github/workflows
```

5. Commit and push:

```powershell
git add .github/workflows/preview-deploy.yml .github/workflows/preview-destroy.yml
git commit -m "Run the e2e suite on Testery from the pipeline"
git push
```

6. Watch the three jobs chain: **Build and push images** → **Deploy preview environment** → **End-to-end tests on Testery**. It takes 7–9 minutes. The e2e log ends with `Completed: 18 of 18 pass with 0 fail`.

```powershell
gh pr checks --watch
```

7. Open https://testery.app → **TestCon 2026 Workshop** → **Test Runs** and find your run (environment `PR #<number> <your branch>`, 18 tests).

8. If the run is red on *Create an order…* or *Remove an employee* with a timeout, that's a known flaky race in the demo app. Open the run in the Actions tab and click **Re-run failed jobs**.

**Catch-up.** PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\catchup.ps1 6
```

bash:

```bash
bash scripts/catchup.sh 6
```

**If it breaks:**

- "Workflow file issue", or no e2e job: `e2e:` must be at 2 spaces, level with `deploy:`.
- The tests run inside the deploy job: you pasted the steps into `deploy`. Move them into their own `e2e` job.
- e2e shows "skipped": the deploy failed. Read the deploy log first.
- Testery shows no tests: the `npx bddgen` line is missing.

---

## Module 7: AI-Driven Development (16:40–17:15) · Lab 7 at ~17:00

> [!TIP]
> **Checkpoint**
>
> Your PR has the Notes feature, deployed, with a green **End-to-end tests on Testery** check of 19 of 19, including *Add a customer with notes*.

1. Make sure you're on your branch, up to date, with the local app running (Docker path):

```powershell
git switch "${ME}/workshop"; git pull; git log --oneline -1; docker compose ps
```

2. Start Claude Code in the repo root:

```powershell
claude
```

3. Install the Testery plugin and sign in to the **TestCon 2026 Workshop** workspace. Run each line inside Claude Code:

```
/plugin marketplace add testery/claude-plugin
```
```
/plugin install testery@testery
```
```
/testery-onboard
```

4. Paste this prompt and press Enter:

```
Add a "notes" text field to Customer. It is optional. The schema change is a new
Flyway migration in db/migrations. Show it in the Customers table and make it
editable in the add/edit form. Add a BDD scenario in web/tests/features/commerce.feature
that adds a customer with notes and checks the notes appear in the table.
Follow CLAUDE.md, run pytest and npm run test:e2e locally, then commit on this
branch and push. Skip the local e2e run and do not install Playwright browsers;
commit and push, and let the pipeline run the suite.
```

5. Watch Claude work and approve when it asks. Say yes to running the tests. Expect a new `db/migrations/V2__*.sql` plus changes to the model, serializer, API client, Customers page, feature file and steps. Then it commits and pushes.

6. Watch the pipeline. It takes 8–9 minutes after the push, and Flyway applies V2 on your preview.

```powershell
gh pr checks --watch
```

7. In Testery under Test Runs, your new run has **19 tests**, including *Add a customer with notes*.

8. Open your preview → **Customers**. Is there a Notes column? Add a customer with a note. Did the AI build what you asked for?

9. **If the run is red**, paste this into the same Claude Code session:

```
The end-to-end check on my PR (End-to-end tests on Testery) failed.
Use the Testery plugin to look at the failed run, work out the root cause,
fix it, and push.
```

10. Write down one thing you'll change in your first week back: the smallest one that removes a manual step from your merge path.

**No Claude Code?** Follow along on the projector, then catch up to the finished feature and watch your own pipeline verify it. PowerShell:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\catchup.ps1 7
```

bash:

```bash
bash scripts/catchup.sh 7
```

**If it breaks:**

- Claude runs `makemigrations` or edits `V1__initial_schema.sql`: stop it and point it at CLAUDE.md. Schema changes are a new `V<next>__*.sql` file.
- Claude writes `V3__*` instead of `V2__*`, or Flyway reports `Found more than one migration with version 2`: the Lab 4b practice file is still there. Delete `db/migrations/V2__add_product_sku.sql`, check it isn't in Claude's commit (`git show --stat HEAD`), and reset the local database with `docker compose down -v; docker compose up -d --build`.
- Claude wants a new branch or PR: tell it to commit on the current branch and push.
- The plugin asks for a token: run `/testery-onboard` and pick the TestCon 2026 Workshop workspace.
- The run is red on a timeout waiting for a new row: that's the known race. Click **Re-run failed jobs**, or let Claude fix it with the prompt in step 9.

---

## After the workshop

Close your workshop PR when you're done. That deletes your environment. If you forget, it's removed automatically after 24 hours.
