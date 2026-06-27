import { expect, test } from "@playwright/test";

import { E2E_FIXTURES } from "./fixtures";
import { login } from "./helpers";

test.describe("payout registration", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  test("registers bank details for payout", async ({ page }) => {
    await page.getByRole("link", { name: "Pay Out" }).click();
    await expect(page).toHaveURL("/payout-info");
    await expect(page.getByRole("heading", { name: "Payout" })).toBeVisible();

    await page.getByLabel("IBAN").fill(E2E_FIXTURES.iban);
    await page.getByLabel("Bank Account Holder").fill(E2E_FIXTURES.accountName);
    await page.getByLabel("E-Mail").fill(E2E_FIXTURES.email);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Save bank data" }).click();

    await expect(page.getByText("Successfully updated bank data")).toBeVisible();
    await expect(page).toHaveURL("/");
    await expect(page.getByText(/You have already provided your bank information/)).toBeVisible();
  });
});
