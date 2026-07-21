import { expect, test, type Locator, type Page } from "@playwright/test";
import { clearAppStorage, createScheduleViaForm } from "./helpers";

test.beforeEach(async ({ page }) => {
  await clearAppStorage(page);
});

/** dnd-kit слушает pointer/mouse, не HTML5 drag — нужен явный путь мыши > activation distance */
async function dragWithPointer(
  page: Page,
  source: Locator,
  target: Locator,
) {
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) {
    throw new Error("Не удалось получить координаты ячеек для drag");
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = targetBox.x + targetBox.width / 2;
  const endY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 8, startY, { steps: 3 });
  await page.mouse.move(endX, endY, { steps: 12 });
  await page.mouse.up();
}

test("перетаскивание смены между ячейками одного сотрудника", async ({
  page,
}) => {
  await createScheduleViaForm(page);

  const sourceCell = page.locator('td[data-day="10"] button').first();
  await sourceCell.click();
  await page.getByRole("option", { name: "7,8" }).click();
  await expect(sourceCell).toHaveText("7,8");
  await expect(page.getByRole("listbox")).toHaveCount(0);

  const targetCell = page.locator('td[data-day="12"] button').first();
  await expect(targetCell).toHaveText("");

  await dragWithPointer(page, sourceCell, targetCell);

  await expect(targetCell).toHaveText("7,8");
  await expect(sourceCell).toHaveText("");
});
