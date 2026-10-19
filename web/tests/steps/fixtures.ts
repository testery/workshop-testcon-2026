import { test as base, createBdd } from "playwright-bdd";

type Fixtures = { testId: string };

export const test = base.extend<Fixtures>({
  testId: async ({}, use) => {
    await use(`t${Date.now()}${Math.floor(Math.random() * 1000)}`);
  },
});

export const { Given, When, Then, AfterStep } = createBdd(test);

const slug = (s: string) => s.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60);

// Screenshot the page after every step, so the report shows each screen the scenario passed
// through, not just the last one. Each one is attached to the Playwright report and also
// saved under screenshots/, the folder Testery uploads images from. Steps that run before the
// first navigation (the Background's test id) have nothing to show, and a failed screenshot
// must never fail the scenario: capturing a blank page can error on headless CI runners.
AfterStep(async ({ page, $step, $testInfo }) => {
  if (page.url() === "about:blank") return;
  const n = String($testInfo.attachments.length + 1).padStart(2, "0");
  const path = `screenshots/${slug($testInfo.title)}/${n}-${slug($step.title)}.png`;
  try {
    await $testInfo.attach($step.title, { body: await page.screenshot({ path }), contentType: "image/png" });
  } catch (e) {
    console.warn(`Screenshot after "${$step.title}" failed: ${e}`);
  }
});
