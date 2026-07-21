import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test";

const save = mock(() => {});

mock.module("html2canvas-pro", () => ({
  default: async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 200;
    canvas.height = 100;
    return canvas;
  },
}));

mock.module("jspdf", () => ({
  jsPDF: class {
    internal = {
      pageSize: {
        getWidth: () => 297,
        getHeight: () => 210,
      },
    };

    addImage() {}

    addPage() {}

    save = save;
  },
}));

const { exportScheduleToPdf } = await import("@/lib/export/pdf");

describe("exportScheduleToPdf", () => {
  beforeEach(() => {
    save.mockClear();
    document.body.className = "";
    document.body.innerHTML = "";
  });

  test("создаёт PDF для существующего элемента", async () => {
    const element = document.createElement("div");
    element.id = "schedule-print-area";
    element.style.width = "800px";
    element.style.height = "600px";
    element.innerHTML =
      '<div class="schedule-table-card"><table></table></div>';
    document.body.appendChild(element);

    await exportScheduleToPdf("schedule-print-area", "grafik.pdf");

    expect(save).toHaveBeenCalledWith("grafik.pdf");
    expect(document.body.classList.contains("schedule-export-mode")).toBe(
      false,
    );
  });

  test("бросает если элемент отсутствует", async () => {
    await expect(
      exportScheduleToPdf("missing-element", "grafik.pdf"),
    ).rejects.toThrow("Элемент для экспорта не найден");
    expect(save).not.toHaveBeenCalled();
  });
});

afterAll(() => {
  mock.restore();
});
