import { expect } from "@playwright/test";
import { Given, When, Then } from "./fixtures";

const suffixed = (name: string, testId: string) => `${name}-${testId}`;

Given("I am on the Agents page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Agents" }).click();
  await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
});

Given("I am on the Sessions page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Sessions" }).click();
  await expect(page.getByRole("heading", { name: "Sessions" })).toBeVisible();
});

async function addAgent(
  page: import("@playwright/test").Page,
  name: string,
  description: string,
) {
  await page.getByPlaceholder("Agent name").fill(name);
  await page.getByPlaceholder("Description").fill(description);
  await page.locator('form button[type="submit"]', { hasText: "Add" }).click();
  await page.getByPlaceholder("Filter agents").fill(name);
  await expect(
    page.locator("tbody tr td", { hasText: new RegExp(`^${name}$`) }),
  ).toBeVisible();
}

Given(
  "an agent exists named {string} with description {string}",
  async ({ page, testId }, name: string, description: string) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Agents" }).click();
    await expect(page.getByRole("heading", { name: "Agents" })).toBeVisible();
    await addAgent(page, suffixed(name, testId), description);
  },
);

When(
  "I add an agent named {string} with description {string}",
  async ({ page, testId }, name: string, description: string) => {
    await addAgent(page, suffixed(name, testId), description);
  },
);

Then(
  "I should see an agent row for {string} with description {string}",
  async ({ page, testId }, name: string, description: string) => {
    const row = page.locator("tbody tr", {
      has: page.locator("td", { hasText: new RegExp(`^${suffixed(name, testId)}$`) }),
    });
    await expect(row).toBeVisible();
    if (description) {
      await expect(row).toContainText(description);
    }
  },
);

When(
  "I start a session titled {string} with agent {string}",
  async ({ page, testId }, title: string, agentName: string) => {
    const fullTitle = suffixed(title, testId);
    const fullAgent = suffixed(agentName, testId);
    await page.getByPlaceholder("Session title").fill(fullTitle);
    await page.locator("form select").selectOption({ label: fullAgent });
    await page.getByRole("button", { name: /Start session|Starting/ }).click();
    await expect(page.getByRole("heading", { name: fullTitle })).toBeVisible();
  },
);

Then(
  "I should be on the session detail page for {string}",
  async ({ page, testId }, title: string) => {
    await expect(
      page.getByRole("heading", { name: suffixed(title, testId) }),
    ).toBeVisible();
    await expect(page.getByTestId("chat-window")).toBeVisible();
  },
);

Then("the session status should be {string}", async ({ page }, status: string) => {
  await expect(page.locator("text=status:")).toContainText(status);
});

When("I send the chat message {string}", async ({ page }, message: string) => {
  await page.getByPlaceholder("Type a message...").fill(message);
  await page.getByRole("button", { name: /Send/ }).click();
});

Then(
  "I should see a user chat bubble with {string}",
  async ({ page }, message: string) => {
    const bubble = page
      .getByTestId("chat-window")
      .locator('[data-role="user"]', { hasText: message });
    await expect(bubble).toBeVisible();
  },
);

Then(
  "I should see an assistant chat bubble containing {string}",
  async ({ page }, fragment: string) => {
    const bubble = page
      .getByTestId("chat-window")
      .locator('[data-role="assistant"]', { hasText: fragment });
    await expect(bubble).toBeVisible();
  },
);

When("I go back from the session detail page", async ({ page }) => {
  await page.getByRole("button", { name: /Back/ }).click();
  await expect(page.getByRole("heading", { name: "Sessions" })).toBeVisible();
});

Then(
  "I should see a session row titled {string} with agent {string}",
  async ({ page, testId }, title: string, agentName: string) => {
    const row = page.locator("tbody tr", {
      has: page.locator("td", { hasText: new RegExp(`^${suffixed(title, testId)}$`) }),
    });
    await expect(row).toBeVisible();
    await expect(row).toContainText(suffixed(agentName, testId));
  },
);
