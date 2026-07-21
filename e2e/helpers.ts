import type { Page } from "@playwright/test";

export async function clearAppStorage(page: Page) {
  await page.goto("/schedules");
  await page.evaluate(() => localStorage.clear());
}

export async function createScheduleViaForm(page: Page) {
  await page.goto("/schedules/new");
  await page.getByLabel("Отделение").fill("E2E отделение");
  await page.getByLabel("Дневные смены").fill("1");
  await page.getByRole("button", { name: "+ Добавить сотрудника" }).click();
  await page.getByLabel("ФИО сотрудника").fill("Тестов Тест");
  await page.getByRole("radio", { name: "День" }).check({ force: true });
  await page.getByRole("button", { name: "Сгенерировать график" }).click();
  await page.waitForURL(/\/schedules\/.+/);
}
