import { expect, type Page } from "@playwright/test";
import { DataTable } from "playwright-bdd";
import { Given, When, Then } from "./fixtures";

const suffixed = (v: string, testId: string) => `${v}-${testId}`;

const emailWithSuffix = (email: string, testId: string) => {
  const [local, domain] = email.split("@");
  return `${local}+${testId}@${domain}`;
};

const customerRow = (page: Page, first: string, last: string) =>
  page
    .locator("tbody tr")
    .filter({ has: page.locator("td", { hasText: new RegExp(`^${first}$`) }) })
    .filter({ has: page.locator("td", { hasText: new RegExp(`^${last}$`) }) });

const productRow = (page: Page, name: string) =>
  page.locator("tbody tr").filter({ has: page.locator("td", { hasText: new RegExp(`^${name}$`) }) });

Given("I am on the Customers page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Customers" }).click();
  await expect(page.getByRole("heading", { name: "Customers" })).toBeVisible();
});

Given("I am on the Products page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Products" }).click();
  await expect(page.getByRole("heading", { name: "Products" })).toBeVisible();
});

Given("I am on the Orders page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Orders" }).click();
  await expect(page.getByRole("heading", { name: "Orders" })).toBeVisible();
});

async function addCustomer(
  page: Page,
  first: string,
  last: string,
  email: string,
  phone: string,
  address: string,
) {
  await page.getByPlaceholder("First name").fill(first);
  await page.getByPlaceholder("Last name").fill(last);
  await page.getByPlaceholder("Email").fill(email);
  await page.getByPlaceholder("Phone").fill(phone);
  await page.getByPlaceholder("Address").fill(address);
  await page.locator('form button[type="submit"]').click();
  await page.getByPlaceholder("Filter customers").fill(last);
  await expect(customerRow(page, first, last)).toBeVisible();
}

When(
  "I add a customer with first name {string} last name {string} email {string} phone {string} address {string}",
  async ({ page, testId }, first: string, last: string, email: string, phone: string, address: string) => {
    await addCustomer(
      page,
      first,
      suffixed(last, testId),
      emailWithSuffix(email, testId),
      phone,
      address,
    );
  },
);

Given(
  "a customer exists with first name {string} last name {string} email {string}",
  async ({ page, testId }, first: string, last: string, email: string) => {
    await addCustomer(page, first, suffixed(last, testId), emailWithSuffix(email, testId), "", "");
  },
);

When(
  "I edit the customer {string} {string} setting phone to {string}",
  async ({ page, testId }, first: string, last: string, phone: string) => {
    await page.getByPlaceholder("Filter customers").fill(suffixed(last, testId));
    await customerRow(page, first, suffixed(last, testId))
      .getByRole("button", { name: /Edit/ })
      .click();
    const editRow = page.locator('tbody tr:has(input)').first();
    // Find the phone input: it's the 4th input (first, last, email, phone, address)
    await editRow.locator("input").nth(3).fill(phone);
    await editRow.getByRole("button", { name: /Save/ }).click();
  },
);

When(
  "I delete the customer {string} {string}",
  async ({ page, testId }, first: string, last: string) => {
    await page.getByPlaceholder("Filter customers").fill(suffixed(last, testId));
    await customerRow(page, first, suffixed(last, testId))
      .getByRole("button", { name: /Delete/ })
      .click();
  },
);

Then(
  "I should see a customer row for {string} {string} with email {string}",
  async ({ page, testId }, first: string, last: string, email: string) => {
    const row = customerRow(page, first, suffixed(last, testId));
    await expect(row).toBeVisible();
    await expect(row).toContainText(emailWithSuffix(email, testId));
  },
);

Then(
  "the customer {string} {string} should show phone {string}",
  async ({ page, testId }, first: string, last: string, phone: string) => {
    await expect(customerRow(page, first, suffixed(last, testId))).toContainText(phone);
  },
);

Then(
  "I should not see a customer row for {string} {string}",
  async ({ page, testId }, first: string, last: string) => {
    await expect(customerRow(page, first, suffixed(last, testId))).toHaveCount(0);
  },
);

async function addProduct(page: Page, name: string, price: string) {
  await page.getByPlaceholder("Product name").fill(name);
  await page.getByPlaceholder("Price").fill(price);
  await page.locator('form button[type="submit"]').click();
  await page.getByPlaceholder("Filter products").fill(name);
  await expect(productRow(page, name)).toBeVisible();
}

When(
  "I add a product with name {string} price {string}",
  async ({ page, testId }, name: string, price: string) => {
    await addProduct(page, suffixed(name, testId), price);
  },
);

Given(
  "a product exists with name {string} price {string}",
  async ({ page, testId }, name: string, price: string) => {
    await addProduct(page, suffixed(name, testId), price);
  },
);

When(
  "I edit the product {string} setting price to {string}",
  async ({ page, testId }, name: string, price: string) => {
    await page.getByPlaceholder("Filter products").fill(suffixed(name, testId));
    await productRow(page, suffixed(name, testId))
      .getByRole("button", { name: /Edit/ })
      .click();
    const editRow = page.locator("tbody tr:has(input)").first();
    await editRow.locator("input").nth(1).fill(price);
    await editRow.getByRole("button", { name: /Save/ }).click();
  },
);

Then(
  "I should see a product row for {string} with price {string}",
  async ({ page, testId }, name: string, price: string) => {
    const row = productRow(page, suffixed(name, testId));
    await expect(row).toBeVisible();
    await expect(row).toContainText(price);
  },
);

async function createOrder(
  page: Page,
  testId: string,
  custFirst: string,
  custLast: string,
  lines: { product: string; quantity: string }[],
) {
  const custSelect = page.locator("select").first();
  const custOption = custSelect.locator("option", { hasText: suffixed(custLast, testId) });
  await expect(custOption).toHaveCount(1);
  await custSelect.selectOption({ label: (await custOption.textContent()) ?? "" });

  for (let i = 0; i < lines.length; i++) {
    if (i > 0) {
      await page.getByRole("button", { name: /Add line/ }).click();
    }
    const lineRows = page.locator("form tbody tr");
    const row = lineRows.nth(i);
    const prodSelect = row.locator("select");
    const prodOption = prodSelect.locator("option", { hasText: suffixed(lines[i].product, testId) });
    await expect(prodOption).toHaveCount(1);
    await prodSelect.selectOption({ label: (await prodOption.textContent()) ?? "" });
    const qtyInput = row.locator('input[type="number"]');
    await qtyInput.fill(lines[i].quantity);
  }
  await page.getByRole("button", { name: /Create order/ }).click();
}

When(
  "I create an order for {string} {string} with products:",
  async ({ page, testId }, first: string, last: string, table: DataTable) => {
    const rows = table.hashes() as { product: string; quantity: string }[];
    await createOrder(page, testId, first, last, rows);
  },
);

Given(
  "an order exists for {string} {string} with product {string} quantity {string}",
  async ({ page, testId }, first: string, last: string, product: string, qty: string) => {
    await createOrder(page, testId, first, last, [{ product, quantity: qty }]);
  },
);

const orderRow = (page: Page, customerFullName: string) =>
  page
    .locator("table")
    .last()
    .locator("tbody tr")
    .filter({ hasText: customerFullName });

Then(
  "I should see an order for {string} with total {string}",
  async ({ page, testId }, customerName: string, total: string) => {
    const [first, last] = customerName.split(" ");
    const fullName = `${first} ${suffixed(last, testId)}`;
    const row = orderRow(page, fullName).first();
    await expect(row).toBeVisible();
    await expect(row).toContainText(total);
  },
);

When(
  "I delete the most recent order for {string}",
  async ({ page, testId }, customerName: string) => {
    const [first, last] = customerName.split(" ");
    const fullName = `${first} ${suffixed(last, testId)}`;
    await orderRow(page, fullName).first().getByRole("button", { name: /Delete/ }).click();
  },
);

Then(
  "I should not see an order for {string}",
  async ({ page, testId }, customerName: string) => {
    const [first, last] = customerName.split(" ");
    const fullName = `${first} ${suffixed(last, testId)}`;
    await expect(orderRow(page, fullName)).toHaveCount(0);
  },
);

When(
  "I open the most recent order for {string}",
  async ({ page, testId }, customerName: string) => {
    const [first, last] = customerName.split(" ");
    const fullName = `${first} ${suffixed(last, testId)}`;
    await orderRow(page, fullName).first().getByRole("button", { name: /View$/ }).click();
    await expect(page.getByRole("heading", { name: /^Order #/ })).toBeVisible();
  },
);

Then(
  "I should be on the order detail page for {string}",
  async ({ page, testId }, customerName: string) => {
    const [first, last] = customerName.split(" ");
    const fullName = `${first} ${suffixed(last, testId)}`;
    await expect(page.getByRole("heading", { name: /^Order #/ })).toBeVisible();
    await expect(page.getByTestId("detail-customer")).toHaveText(fullName);
  },
);

Then(
  "the order detail total should be {string}",
  async ({ page }, total: string) => {
    await expect(page.getByTestId("detail-total")).toHaveText(total);
  },
);

When(
  "I set the first line quantity to {string} on the detail page",
  async ({ page }, qty: string) => {
    await page.locator('tbody tr input[type="number"]').first().fill(qty);
  },
);

When("I save the order", async ({ page }) => {
  await page.getByRole("button", { name: /Save changes/ }).click();
});

When("I cancel the order from the detail page", async ({ page }) => {
  await page.getByRole("button", { name: /Cancel order/ }).click();
});
