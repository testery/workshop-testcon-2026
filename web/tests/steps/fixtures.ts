import { test as base, createBdd } from "playwright-bdd";

type Fixtures = { testId: string };

export const test = base.extend<Fixtures>({
  testId: async ({}, use) => {
    await use(`t${Date.now()}${Math.floor(Math.random() * 1000)}`);
  },
});

export const { Given, When, Then, AfterStep } = createBdd(test);

// Screenshot the page after every step, so the report (and Testery) shows each screen the
// scenario passed through, not just the last one.
AfterStep(async ({ page, $step, $testInfo }) => {
  await $testInfo.attach($step.title, { body: await page.screenshot(), contentType: "image/png" });
});
