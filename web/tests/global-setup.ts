import { chromium, type FullConfig } from "@playwright/test";

export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL ?? "http://localhost:5174";
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  const resp = await page.request.get(`${baseURL}/api/auth/dev-login`);
  if (!resp.ok()) {
    throw new Error(`dev-login failed: ${resp.status()} — ensure the API is running in DEBUG mode`);
  }
  await context.storageState({ path: "tests/.auth/storage.json" });
  await browser.close();
}
