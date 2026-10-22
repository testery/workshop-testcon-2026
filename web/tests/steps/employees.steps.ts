import { expect } from "@playwright/test";
import { Given, When, Then } from "./fixtures";

const suffixed = (last: string, testId: string) => `${last}-${testId}`;

// Local calendar date as YYYY-MM-DD, the value of an <input type="date"> and how hire dates display.
const daysAgo = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const rowFor = (page: import("@playwright/test").Page, first: string, last: string) =>
  page.locator("tbody tr", {
    has: page.locator("td", { hasText: new RegExp(`^${first}$`) }),
  }).filter({ has: page.locator("td", { hasText: new RegExp(`^${last}$`) }) });

Given("a unique test run id", async ({ testId }) => {
  expect(testId).toMatch(/^t\d+/);
});

Given("I am on the Employees page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Employees" }).click();
  await expect(page.getByRole("heading", { name: "Employees" })).toBeVisible();
});

async function addEmployee(
  page: import("@playwright/test").Page,
  first: string,
  last: string,
  age: string,
  hireDate?: string,
) {
  await page.getByPlaceholder("First name").fill(first);
  await page.getByPlaceholder("Last name").fill(last);
  await page.getByPlaceholder("Age").fill(age);
  if (hireDate) await page.getByLabel("Hire date").fill(hireDate);
  await page.locator('form button[type="submit"]').click();
  await page.getByPlaceholder("Filter by name").fill(last);
  await expect(rowFor(page, first, last)).toBeVisible();
}

Given(
  "an employee exists with first name {string} last name {string} age {string}",
  async ({ page, testId }, first: string, last: string, age: string) => {
    await addEmployee(page, first, suffixed(last, testId), age);
  },
);

When(
  "I add an employee with first name {string} last name {string} age {string}",
  async ({ page, testId }, first: string, last: string, age: string) => {
    await addEmployee(page, first, suffixed(last, testId), age);
  },
);

When(
  "I add an employee with first name {string} last name {string} age {string} without a hire date",
  async ({ page, testId }, first: string, last: string, age: string) => {
    await addEmployee(page, first, suffixed(last, testId), age);
  },
);

When(
  "I add an employee with first name {string} last name {string} age {string} hired {int} days ago",
  async ({ page, testId }, first: string, last: string, age: string, days: number) => {
    await addEmployee(page, first, suffixed(last, testId), age, daysAgo(days));
  },
);

When(
  "I edit the employee {string} {string} setting age to {string}",
  async ({ page, testId }, first: string, last: string, age: string) => {
    await rowFor(page, first, suffixed(last, testId))
      .getByRole("button", { name: /Edit/ })
      .click();
    const editRow = page.locator('tbody tr:has(input[type="number"])');
    await editRow.locator('input[type="number"]').fill(age);
    await editRow.getByRole("button", { name: /Save/ }).click();
  },
);

When(
  "I edit the employee {string} {string} setting supervisor to {string} {string}",
  async (
    { page, testId },
    first: string,
    last: string,
    supFirst: string,
    supLast: string,
  ) => {
    await rowFor(page, first, suffixed(last, testId))
      .getByRole("button", { name: /Edit/ })
      .click();
    const editRow = page.locator('tbody tr:has(input[type="number"])');
    await editRow
      .locator("select")
      .selectOption({ label: `${supFirst} ${suffixed(supLast, testId)}` });
    await editRow.getByRole("button", { name: /Save/ }).click();
  },
);

When(
  "I delete the employee {string} {string}",
  async ({ page, testId }, first: string, last: string) => {
    page.once("dialog", (d) => d.accept());
    await rowFor(page, first, suffixed(last, testId))
      .getByRole("button", { name: /Delete/ })
      .click();
  },
);

Then(
  "I should see an employee row for {string} {string} with age {string}",
  async ({ page, testId }, first: string, last: string, age: string) => {
    const row = rowFor(page, first, suffixed(last, testId));
    await expect(row).toBeVisible();
    await expect(row.locator("td", { hasText: new RegExp(`^${age}$`) })).toBeVisible();
  },
);

Then(
  "the employee {string} {string} should show supervisor {string}",
  async ({ page, testId }, first: string, last: string, supName: string) => {
    const [supFirst, supLast] = supName.split(" ");
    const expected = `${supFirst} ${suffixed(supLast, testId)}`;
    const row = rowFor(page, first, suffixed(last, testId));
    await expect(row).toContainText(expected);
  },
);

Then(
  "the employee {string} {string} should show a hire date of today",
  async ({ page, testId }, first: string, last: string) => {
    await expect(rowFor(page, first, suffixed(last, testId))).toContainText(daysAgo(0));
  },
);

Then(
  "the employee {string} {string} should show a hire date {int} days ago",
  async ({ page, testId }, first: string, last: string, days: number) => {
    await expect(rowFor(page, first, suffixed(last, testId))).toContainText(daysAgo(days));
  },
);

Then(
  "I should not see an employee row for {string} {string}",
  async ({ page, testId }, first: string, last: string) => {
    await expect(rowFor(page, first, suffixed(last, testId))).toHaveCount(0);
  },
);
