import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

const baseURL = process.env.BASE_URL ?? "http://localhost:5173";
const isLocal = !process.env.BASE_URL;
const testDir = defineBddConfig({
  features: "tests/features/**/*.feature",
  steps: "tests/steps/**/*.ts",
});

export default defineConfig({
  use: {
    baseURL,
    trace: "retain-on-failure",
    video: "retain-on-failure",
    screenshot: "on",
    storageState: "tests/.auth/storage.json",
  },
  webServer: isLocal
    ? { command: "npm run dev", url: "http://localhost:5173", reuseExistingServer: !process.env.CI }
    : undefined,
  testDir,
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["html", { open: "never" }], ["list"]],
  globalSetup: "./tests/global-setup.ts",
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Maximize the browser window. Headed runs fill the screen; headless runs (CI,
        // Testery) get a 1920x1080 window. A null viewport follows the window size.
        viewport: null,
        deviceScaleFactor: undefined,
        launchOptions: { args: ["--start-maximized", "--window-size=1920,1080"] },
      },
    },
  ],

});
