import { expect, Page } from "@playwright/test";

import { E2E_FIXTURES } from "./fixtures";

export async function login(page: Page, pin: string = E2E_FIXTURES.pin): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Wristband Tag Pin").fill(pin);
  await page.getByRole("button", { name: "Login" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByText(E2E_FIXTURES.pin)).toBeVisible();
}
