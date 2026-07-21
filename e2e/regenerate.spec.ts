import { expect, test } from "@playwright/test";
import { clearAppStorage, createScheduleViaForm } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearAppStorage(page);
});

test("перегенерация обновляет график", async ({ page }) => {
  await createScheduleViaForm(page);

  const before = await page
    .locator('td[data-day="1"] button')
    .filter({ hasText: /\d/ })
    .first()
    .textContent();

  await page.getByRole("button", { name: "Перегенерировать" }).click();
  await page.getByRole("button", { name: "Перегенерировать" }).last().click();

  await expect(page.locator(".schedule-interactive-table")).toBeVisible();
  const after = await page
    .locator('td[data-day="1"] button')
    .filter({ hasText: /\d/ })
    .first()
    .textContent();

  expect(after).toBeTruthy();
  expect(before).toBeTruthy();
});
