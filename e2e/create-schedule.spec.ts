import { expect, test } from "@playwright/test";
import { clearAppStorage, createScheduleViaForm } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearAppStorage(page);
});

test("создание графика открывает редактор", async ({ page }) => {
  await createScheduleViaForm(page);
  await expect(page.locator(".schedule-table-title")).toHaveText(
    "E2E отделение",
  );
  await expect(page.locator(".schedule-interactive-table")).toBeVisible();
});
