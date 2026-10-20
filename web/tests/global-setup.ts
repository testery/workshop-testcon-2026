import { chromium, type FullConfig } from "@playwright/test";

const HEALTH_ATTEMPTS = 30;
const HEALTH_INTERVAL_MS = 5_000;

// A fresh preview environment can take a while to come up (database, migrations, API,
// ingress), so wait for the health endpoint instead of assuming the app is ready.
async function waitForReady(baseURL: string) {
  const url = `${baseURL}/api/health/`;
  let last = "no response";
  for (let attempt = 1; attempt <= HEALTH_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(url);
      if (resp.status === 200) return;
      last = `HTTP ${resp.status}`;
    } catch (err) {
      last = err instanceof Error ? err.message : String(err);
    }
    console.log(`Waiting for ${url} (attempt ${attempt}/${HEALTH_ATTEMPTS}): ${last}`);
    if (attempt < HEALTH_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, HEALTH_INTERVAL_MS));
    }
  }
  throw new Error(
    `${url} did not return 200 after ${HEALTH_ATTEMPTS} attempts (last: ${last}) - is the app running at ${baseURL}?`,
  );
}

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:5173";
  await waitForReady(baseURL);
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
