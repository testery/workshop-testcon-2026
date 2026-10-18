# Module 5: Creating automated tests

> [!TIP]
> Copy-paste commands for this module's lab, with the fixes from the rehearsal, are in [LAB-STEPS.md](LAB-STEPS.md) under **Module 5**.

**Lab (12 min): make the suite run against any URL, then run it against your preview.**

## Where we are

`web/playwright.config.ts` hardcodes `http://localhost:5173` and starts the Vite dev server
itself. That is fine on a laptop and useless in a pipeline. The suite should not know where it
is running.

## Steps

1. In `web/playwright.config.ts`, read the base URL from the environment and only start the
   dev server when there is no `BASE_URL`:
   ```ts
   const baseURL = process.env.BASE_URL ?? "http://localhost:5173";
   const isLocal = !process.env.BASE_URL;

   export default defineConfig({
     // ...
     use: {
       baseURL,
       trace: "retain-on-failure",
       video: "retain-on-failure",
       screenshot: "only-on-failure",
       storageState: "tests/.auth/storage.json",
     },
     webServer: isLocal
       ? { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: !process.env.CI }
       : undefined,
   });
   ```
   Also add `retries: process.env.CI ? 1 : 0` and sensible `timeout` / `expect.timeout`
   values (45s / 10s). Retries are not a fix for flakiness, but one retry on a freshly
   deployed environment is honest.
2. In `web/tests/global-setup.ts`, add a readiness gate before signing in. Poll
   `/api/health/` until it returns 200 (30 attempts, 5s apart) instead of assuming the app is
   up. The finished version is in `module-05-complete` if you want to copy it.
3. Run the suite against your preview from your laptop:
   ```bash
   cd web
   npm install && npx playwright install chromium
   BASE_URL=$(../scripts/preview-url.sh) npm run test:e2e
   ```
   PowerShell: `$env:BASE_URL = "https://<your-branch>.testcon.testery.academy"; npm run test:e2e`
4. Open the report: `npx playwright show-report`.
5. Commit and push the config changes.

## What to notice

- No test changed. Only configuration did. If you had to edit a test to point it at another
  environment, that test was coupled to a place, not to behavior.
- Each scenario creates its own employee/customer with a unique suffix, so ten people can run
  the suite against the same environment at the same time. Try it: run it while your neighbour
  does.
- The demo login happens once in `global-setup.ts` and the session is reused via
  `storageState`. Signing in per test is slow and is where a lot of flakiness starts.
- What runs on every PR vs nightly: tag scenarios (`@smoke`) and filter with
  `--grep @smoke` when the full suite gets too slow for PR feedback.

## Checkpoint

`npm run test:e2e` passes against your preview URL from your laptop, and the config is pushed.

Stuck? `scripts/catchup.sh 5`
