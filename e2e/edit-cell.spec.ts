import { expect, test } from "@playwright/test";
import { clearAppStorage, createScheduleViaForm } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearAppStorage(page);
});

test("редактирование ячейки сохраняется после перезагрузки", async ({
  page,
}) => {
  await createScheduleViaForm(page);

  const filledCell = page
    .locator('td[data-day="1"] button')
    .filter({
      hasText: /\d/,
    })
    .first();
  await filledCell.click();
  await page.getByRole("option", { name: "7,8" }).click();

  await page.reload();
  await expect(
    page.locator('td[data-day="1"] button').filter({ hasText: "7,8" }).first(),
  ).toBeVisible();
});
