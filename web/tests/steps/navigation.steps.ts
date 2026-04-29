import { expect } from "@playwright/test";
import { createBdd } from "playwright-bdd";

const { Given, When, Then } = createBdd();

Given("I am on the home page", async ({ page }) => {
  await page.goto("/");
});

When("I click the {string} menu item", async ({ page }, label: string) => {
  await page.getByRole("button", { name: label }).click();
});

When("I open the user menu", async ({ page }) => {
  await page.getByRole("button", { name: /Guest/ }).click();
});

When("I click {string}", async ({ page }, label: string) => {
  await page.getByRole("button", { name: label }).click();
});

Then("I should see the {string} heading", async ({ page }, text: string) => {
  await expect(page.getByRole("heading", { name: text })).toBeVisible();
});

Then(
  "the user menu button should show {string}",
  async ({ page }, name: string) => {
    await expect(page.getByRole("button", { name: new RegExp(name) })).toBeVisible();
  },
);

Given("I am unauthenticated", async ({ page }) => {
  await page.context().clearCookies();
});

When("I visit a secure page", async ({ page }) => {
  await page.goto("/");
});

Then("I am redirected to the login page", async ({ page }) => {
  await expect(page).toHaveURL(/login/);
});
