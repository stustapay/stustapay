import { expect, test } from "@playwright/test";

import { E2E_FIXTURES } from "./fixtures";

test.describe("login", () => {
  test("logs in with a wristband tag pin", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();

    await page.getByLabel("Wristband Tag Pin").fill(E2E_FIXTURES.pin);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText(E2E_FIXTURES.balance)).toBeVisible();
    await expect(page.getByText(E2E_FIXTURES.pin)).toBeVisible();
    await expect(page.getByRole("button", { name: "Logout" })).toBeVisible();
  });

  test("redirects unauthenticated users to login with next parameter", async ({ page }) => {
    await page.goto("/payout-info");

    await expect(page).toHaveURL(/\/login\?next=\/payout-info/);
    await page.getByLabel("Wristband Tag Pin").fill(E2E_FIXTURES.pin);
    await page.getByRole("button", { name: "Login" }).click();

    await expect(page).toHaveURL("/payout-info");
    await expect(page.getByRole("heading", { name: "Payout" })).toBeVisible();
  });
});
