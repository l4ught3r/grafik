import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

export async function exportScheduleToPdf(
  elementId: string,
  fileName: string,
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error("Элемент для экспорта не найден");
  }

  document.body.classList.add("schedule-export-mode");
  await new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });

  const scrollable = element.querySelector(".schedule-table-card");
  if (scrollable instanceof HTMLElement) {
    scrollable.scrollLeft = 0;
  }

  const captureWidth = element.scrollWidth;
  const captureHeight = element.scrollHeight;

  let canvas: HTMLCanvasElement;
  try {
    canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: captureWidth,
      height: captureHeight,
      windowWidth: captureWidth,
      windowHeight: captureHeight,
      scrollX: 0,
      scrollY: 0,
    });
  } finally {
    document.body.classList.remove("schedule-export-mode");
  }

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const margin = 4;
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  const imgWidth = availableWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const offsetX = (pageWidth - imgWidth) / 2;

  if (imgHeight <= availableHeight) {
    const offsetY = (pageHeight - imgHeight) / 2;
    pdf.addImage(imgData, "PNG", offsetX, offsetY, imgWidth, imgHeight);
  } else {
    let heightLeft = imgHeight;
    let position = margin;

    pdf.addImage(imgData, "PNG", offsetX, position, imgWidth, imgHeight);
    heightLeft -= availableHeight;

    while (heightLeft > 0) {
      position -= availableHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", offsetX, position, imgWidth, imgHeight);
      heightLeft -= availableHeight;
    }
  }

  pdf.save(fileName);
}
