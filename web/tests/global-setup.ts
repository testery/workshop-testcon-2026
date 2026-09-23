import { chromium, type FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:5173";
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
