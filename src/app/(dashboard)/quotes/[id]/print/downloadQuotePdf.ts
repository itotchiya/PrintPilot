"use client";

const A4_HEIGHT_MM = 297;
const A4_WIDTH_MM = 210;
const PAGE_MARGIN_MM = 10;
const SCALE = 2;

/**
 * Get section boundaries (top and bottom in px) relative to the container.
 */
function getSectionBoundaries(container: HTMLElement): { bottomsPx: number[]; containerHeightPx: number } {
  const containerRect = container.getBoundingClientRect();
  const containerHeightPx = containerRect.height;
  const sections = container.querySelectorAll<HTMLElement>(".print-section");
  const bottomsPx: number[] = [0];
  for (const section of sections) {
    const r = section.getBoundingClientRect();
    const bottom = r.bottom - containerRect.top;
    if (bottom > bottomsPx[bottomsPx.length - 1]) {
      bottomsPx.push(bottom);
    }
  }
  return { bottomsPx, containerHeightPx };
}

/**
 * Captures the full .print-page once, then slices into A4 pages only at section
 * boundaries so no section is ever cut in the middle. Adds margin to each page.
 */
export async function downloadQuotePdf(quoteNumber: string): Promise<void> {
  const el = document.querySelector(".print-page") as HTMLElement | null;
  if (!el) {
    console.error("Print page element not found");
    return;
  }

  const [html2canvas, { jsPDF }] = await Promise.all([
    import("html2canvas").then((m) => m.default),
    import("jspdf"),
  ]);

  const { bottomsPx: sectionBottomsPx, containerHeightPx } = getSectionBoundaries(el);
  const canvas = await html2canvas(el, {
    scale: SCALE,
    useCORS: true,
    allowTaint: true,
    backgroundColor: "#ffffff",
    logging: false,
  });

  const contentWidth = A4_WIDTH_MM - 2 * PAGE_MARGIN_MM;
  const imgHeightMm = (canvas.height * contentWidth) / canvas.width;
  const pageHeightMm = A4_HEIGHT_MM - 2 * PAGE_MARGIN_MM;

  // Convert section boundaries from px to content mm
  const breakPointsMm = [
    0,
    ...sectionBottomsPx.slice(1).map((bottomPx) => (bottomPx / containerHeightPx) * imgHeightMm),
    imgHeightMm,
  ].filter((v, i, a) => a.indexOf(v) === i);
  breakPointsMm.sort((a, b) => a - b);

  // Build page ranges: only break at section boundaries; if a section is taller than one page, break at pageHeight
  const pageRanges: { start: number; end: number }[] = [];
  let current = 0;
  while (current < imgHeightMm) {
    const maxEnd = current + pageHeightMm;
    const safeBreaks = breakPointsMm.filter((b) => b > current && b <= maxEnd);
    const end =
      safeBreaks.length > 0
        ? Math.max(...safeBreaks)
        : Math.min(current + pageHeightMm, imgHeightMm);
    pageRanges.push({ start: current, end });
    current = end;
  }

  if (pageRanges.length === 0) pageRanges.push({ start: 0, end: imgHeightMm });

  const pdf = new jsPDF("p", "mm", "a4", true);
  const pxPerMm = canvas.height / imgHeightMm;

  for (let i = 0; i < pageRanges.length; i++) {
    const { start, end } = pageRanges[i];
    const sliceHeightMm = end - start;
    const startPx = start * pxPerMm;
    const sliceHeightPx = sliceHeightMm * pxPerMm;

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = Math.ceil(sliceHeightPx);
    const ctx = sliceCanvas.getContext("2d");
    if (!ctx) continue;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(
      canvas,
      0,
      startPx,
      canvas.width,
      sliceHeightPx,
      0,
      0,
      canvas.width,
      sliceHeightPx
    );

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95);
    if (i > 0) pdf.addPage();
    pdf.addImage(
      sliceData,
      "JPEG",
      PAGE_MARGIN_MM,
      PAGE_MARGIN_MM,
      contentWidth,
      sliceHeightMm,
      undefined,
      "FAST"
    );
  }

  const filename = `PrintPilot-devis-${(quoteNumber || "devis").trim()}.pdf`;
  pdf.save(filename);
}
