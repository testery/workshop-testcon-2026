import { test as base, createBdd } from "playwright-bdd";

type Fixtures = { testId: string };

export const test = base.extend<Fixtures>({
  testId: async ({}, use) => {
    await use(`t${Date.now()}${Math.floor(Math.random() * 1000)}`);
  },
});

export const { Given, When, Then } = createBdd(test);
