import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const testDir = defineBddConfig({
  features: "tests/features/**/*.feature",
  steps: "tests/steps/**/*.ts",
});

const baseURL = process.env.BASE_URL ?? "http://localhost:5173";
const isLocal = !process.env.BASE_URL;

export default defineConfig({
  testDir,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./tests/global-setup.ts",
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
    ? { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: !process.env.CI }
    : undefined,
});
