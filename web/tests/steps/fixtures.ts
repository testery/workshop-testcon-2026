import { test as base, createBdd } from "playwright-bdd";

type Fixtures = { testId: string };

export const test = base.extend<Fixtures>({
  testId: async ({}, use) => {
    await use(`t${Date.now()}${Math.floor(Math.random() * 1000)}`);
  },
});

export const { Given, When, Then, AfterStep } = createBdd(test);

// Screenshot the page after every step, so the report shows each screen the scenario passed
// through, not just the last one. Steps that run before the first navigation (the
// Background's test id) have nothing to show, and a failed screenshot must never fail the
// scenario: capturing a blank page can error on headless CI runners.
AfterStep(async ({ page, $step, $testInfo }) => {
  if (page.url() === "about:blank") return;
  try {
    await $testInfo.attach($step.title, { body: await page.screenshot(), contentType: "image/png" });
  } catch (e) {
    console.warn(`Screenshot after "${$step.title}" failed: ${e}`);
  }
});
