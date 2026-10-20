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
