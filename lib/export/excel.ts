import type { Cell, Fill, Style } from "exceljs";
import ExcelJS from "exceljs";
import { getMonthCalendar, isDateInVacation } from "@/lib/calendar";
import {
  formatCoverageCellText,
  getDayCoverageStatus,
  hasCoverageRequirements,
} from "@/lib/coverage";
import {
  getBaseRate,
  getEmployeeRateFraction,
  sumEmployeeHoursForMonth,
} from "@/lib/hours";
import { isSickDay } from "@/lib/sick-days";
import { MONTH_NAMES, type Schedule } from "@/lib/types";
import { formatHours, formatRate } from "@/lib/utils";

const COLORS = {
  background: "FFF4F6F9",
  surface: "FFFFFFFF",
  zebra: "FFFAFBFC",
  border: "FFE2E8F0",
  muted: "FF64748B",
  foreground: "FF1E293B",
  primary: "FF2563EB",
  weekend: "FFEEF2F7",
  accentSoft: "FFEFF6FF",
  success: "FF059669",
  danger: "FFDC2626",
  warning: "FFD97706",
} as const;

const THIN_BORDER = {
  top: { style: "thin" as const, color: { argb: COLORS.border } },
  left: { style: "thin" as const, color: { argb: COLORS.border } },
  bottom: { style: "thin" as const, color: { argb: COLORS.border } },
  right: { style: "thin" as const, color: { argb: COLORS.border } },
};

function applyBorder(cell: Cell): void {
  cell.border = THIN_BORDER;
}

function setFill(cell: Cell, color: string): void {
  cell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: color },
  } satisfies Fill;
}

function setCellStyle(
  cell: Cell,
  style: Partial<Style> & { fillColor?: string },
): void {
  const { fillColor, ...rest } = style;
  Object.assign(cell, rest);
  applyBorder(cell);
  if (fillColor) setFill(cell, fillColor);
}

function downloadBuffer(buffer: ArrayBuffer, fileName: string): void {
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

export async function exportScheduleToExcel(schedule: Schedule): Promise<void> {
  const calendar = getMonthCalendar(schedule.year, schedule.month);
  const baseRate = getBaseRate(schedule.year, schedule.month);
  const dayCount = calendar.length;
  const colCount = 2 + dayCount + 3;
  const showCoverage = hasCoverageRequirements(schedule);

  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("График", {
    pageSetup: {
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    },
  });

  worksheet.columns = [
    { width: 4 },
    { width: 28 },
    ...calendar.map(() => ({ width: 5 })),
    { width: 10 },
    { width: 10 },
    { width: 10 },
  ];

  const titleRow = worksheet.getRow(1);
  titleRow.height = 28;
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = schedule.departmentName;
  worksheet.mergeCells(1, 1, 1, colCount);
  setCellStyle(titleCell, {
    font: { bold: true, size: 14, color: { argb: COLORS.foreground } },
    alignment: { horizontal: "center", vertical: "middle" },
    fillColor: COLORS.accentSoft,
  });

  const subtitleRow = worksheet.getRow(2);
  subtitleRow.height = 20;
  const subtitleCell = worksheet.getCell(2, 1);
  subtitleCell.value = `${MONTH_NAMES[schedule.month - 1]} ${schedule.year} · Ставка: ${formatHours(baseRate)} ч`;
  worksheet.mergeCells(2, 1, 2, colCount);
  setCellStyle(subtitleCell, {
    font: { size: 11, color: { argb: COLORS.muted } },
    alignment: { horizontal: "center", vertical: "middle" },
    fillColor: COLORS.accentSoft,
  });

  const headerRowIndex = 4;
  const headerRow = worksheet.getRow(headerRowIndex);
  headerRow.height = 22;

  const headers: (string | number)[] = [
    "№",
    "ФИО",
    ...calendar.map((d) => d.day),
    "Итого",
    "Ставка",
    "Разница",
  ];

  headers.forEach((header, colIndex) => {
    const cell = headerRow.getCell(colIndex + 1);
    cell.value = header;
    const dayInfo = calendar[colIndex - 2];
    const isWeekendCol =
      colIndex >= 2 &&
      colIndex < 2 + dayCount &&
      dayInfo &&
      !dayInfo.isWorkingDay;

    setCellStyle(cell, {
      font: {
        bold: true,
        size: 10,
        color: {
          argb:
            isWeekendCol && dayInfo?.isHoliday ? COLORS.primary : COLORS.muted,
        },
      },
      alignment: { horizontal: "center", vertical: "middle" },
      fillColor: isWeekendCol ? COLORS.weekend : COLORS.background,
    });
  });

  schedule.employees.forEach((emp, index) => {
    const rowIndex = headerRowIndex + 1 + index;
    const row = worksheet.getRow(rowIndex);
    row.height = 18;
    const isEven = index % 2 === 1;
    const rowFill = isEven ? COLORS.zebra : COLORS.surface;

    const empCells = schedule.cells[emp.id] ?? {};
    const total = sumEmployeeHoursForMonth(empCells, emp.vacations, calendar);
    const diff = total - baseRate;
    const employeeRate = getEmployeeRateFraction(total, baseRate);

    const numCell = row.getCell(1);
    numCell.value = index + 1;
    setCellStyle(numCell, {
      font: { size: 10, color: { argb: COLORS.muted } },
      alignment: { horizontal: "center", vertical: "middle" },
      fillColor: rowFill,
    });

    const nameCell = row.getCell(2);
    nameCell.value = emp.name;
    setCellStyle(nameCell, {
      font: { bold: true, size: 10, color: { argb: COLORS.foreground } },
      alignment: { horizontal: "left", vertical: "middle" },
      fillColor: rowFill,
    });

    calendar.forEach((d, dayIndex) => {
      const cell = row.getCell(3 + dayIndex);
      const isVacation = isDateInVacation(d.date, emp.vacations);
      const isSick = isSickDay(schedule.sickDays, emp.id, d.day);
      const hours = empCells[d.day];
      const isWeekend = !d.isWorkingDay;

      if (isVacation) {
        cell.value = "отпуск";
        setCellStyle(cell, {
          font: {
            italic: true,
            size: 10,
            color: { argb: COLORS.muted },
          },
          alignment: { horizontal: "center", vertical: "middle" },
          fillColor: isWeekend ? COLORS.weekend : rowFill,
        });
      } else if (isSick) {
        cell.value = "б/л";
        setCellStyle(cell, {
          font: {
            italic: true,
            size: 10,
            color: { argb: COLORS.muted },
          },
          alignment: { horizontal: "center", vertical: "middle" },
          fillColor: isWeekend ? COLORS.weekend : rowFill,
        });
      } else {
        cell.value = hours != null ? formatHours(hours) : "";
        setCellStyle(cell, {
          font: { size: 10, color: { argb: COLORS.foreground } },
          alignment: { horizontal: "center", vertical: "middle" },
          fillColor: isWeekend ? COLORS.weekend : rowFill,
        });
      }
    });

    const totalCol = 3 + dayCount;
    const totalCell = row.getCell(totalCol);
    totalCell.value = formatHours(total);
    setCellStyle(totalCell, {
      font: { bold: true, size: 10, color: { argb: COLORS.foreground } },
      alignment: { horizontal: "center", vertical: "middle" },
      fillColor: rowFill,
    });

    const rateCell = row.getCell(totalCol + 1);
    rateCell.value = formatRate(employeeRate);
    setCellStyle(rateCell, {
      font: { size: 10, color: { argb: COLORS.muted } },
      alignment: { horizontal: "center", vertical: "middle" },
      fillColor: rowFill,
    });

    const diffCell = row.getCell(totalCol + 2);
    diffCell.value = `${diff >= 0 ? "+" : ""}${formatHours(diff)}`;
    setCellStyle(diffCell, {
      font: {
        bold: true,
        size: 10,
        color: { argb: diff < 0 ? COLORS.danger : COLORS.success },
      },
      alignment: { horizontal: "center", vertical: "middle" },
      fillColor: rowFill,
    });
  });

  if (showCoverage) {
    const coverageRowIndex = headerRowIndex + 1 + schedule.employees.length;
    const coverageRow = worksheet.getRow(coverageRowIndex);
    coverageRow.height = 24;

    const dashCell = coverageRow.getCell(1);
    dashCell.value = "—";
    setCellStyle(dashCell, {
      font: { size: 10, color: { argb: COLORS.muted } },
      alignment: { horizontal: "center", vertical: "middle" },
      fillColor: COLORS.background,
    });

    const labelCell = coverageRow.getCell(2);
    labelCell.value = "Покрытие";
    setCellStyle(labelCell, {
      font: { size: 9, color: { argb: COLORS.muted } },
      alignment: { horizontal: "left", vertical: "middle" },
      fillColor: COLORS.background,
    });

    calendar.forEach((d, dayIndex) => {
      const cell = coverageRow.getCell(3 + dayIndex);
      const status = getDayCoverageStatus(schedule, d);
      cell.value = formatCoverageCellText(status);
      const isWeekend = !d.isWorkingDay;

      const fontColor =
        status.items.length === 0
          ? COLORS.muted
          : status.items.some((item) => item.diff < 0)
            ? COLORS.danger
            : COLORS.warning;

      setCellStyle(cell, {
        font: { size: 9, color: { argb: fontColor } },
        alignment: {
          horizontal: "center",
          vertical: "middle",
          wrapText: true,
        },
        fillColor: isWeekend ? COLORS.weekend : COLORS.background,
      });
    });

    const footerMergeStart = 3 + dayCount;
    worksheet.mergeCells(
      coverageRowIndex,
      footerMergeStart,
      coverageRowIndex,
      colCount,
    );
    const footerCell = coverageRow.getCell(footerMergeStart);
    setCellStyle(footerCell, {
      fillColor: COLORS.background,
    });
  }

  worksheet.views = [{ state: "frozen", xSplit: 2, ySplit: headerRowIndex }];

  const fileName = `grafik_${schedule.departmentName}_${schedule.month}_${schedule.year}.xlsx`;
  const buffer = await workbook.xlsx.writeBuffer();
  downloadBuffer(buffer, fileName);
}
