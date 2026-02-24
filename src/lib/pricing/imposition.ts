/**
 * Imposition = how many copies of the product fit on one machine sheet.
 * For offset printing; XLSM supports 64×90, 65×92, 72×102 and picks optimal.
 */

export interface ImpositionInput {
  productWidthCm: number;
  productHeightCm: number;
  machineWidthCm: number;  // typically 65 for 65×92 format
  machineHeightCm: number; // typically 92
  bleedCm: number;         // typically 0.3 cm bleed each side
}

/** How many poses (copies of the product) fit per machine sheet, both sides */
export function calcPosesPerSheet(input: ImpositionInput): number {
  const { productWidthCm, productHeightCm, machineWidthCm, machineHeightCm, bleedCm } = input;
  const pw = productWidthCm + bleedCm * 2;
  const ph = productHeightCm + bleedCm * 2;

  // Try both orientations: product upright and rotated
  const posesUpright = Math.floor(machineWidthCm / pw) * Math.floor(machineHeightCm / ph);
  const posesRotated = Math.floor(machineWidthCm / ph) * Math.floor(machineHeightCm / pw);
  return Math.max(posesUpright, posesRotated, 1);
}

export interface MachineFormatOption {
  widthCm: number;
  heightCm: number;
  name?: string;
}

export interface OptimalFormatResult {
  widthCm: number;
  heightCm: number;
  posesPerSheet: number;
  formatName?: string;
  /** Tumble (bascule): sheet flipped for back side; same poses, operational detail */
  bascule: boolean;
}

/**
 * XLSM: compute poses for each machine format and pick the one with most poses (least waste).
 * Tie-break: prefer smaller sheet area to reduce paper cost.
 */
export function pickOptimalMachineFormat(
  productWidthCm: number,
  productHeightCm: number,
  formats: MachineFormatOption[],
  bleedCm = 0.3
): OptimalFormatResult {
  if (formats.length === 0) {
    return { widthCm: 65, heightCm: 92, posesPerSheet: calcPosesPerSheet({ productWidthCm, productHeightCm, machineWidthCm: 65, machineHeightCm: 92, bleedCm }), bascule: false };
  }
  let best = { widthCm: formats[0].widthCm, heightCm: formats[0].heightCm, name: formats[0].name, poses: 0, area: Infinity };
  for (const f of formats) {
    const poses = calcPosesPerSheet({
      productWidthCm,
      productHeightCm,
      machineWidthCm: f.widthCm,
      machineHeightCm: f.heightCm,
      bleedCm,
    });
    const area = f.widthCm * f.heightCm;
    if (poses > best.poses || (poses === best.poses && area < best.area)) {
      best = { widthCm: f.widthCm, heightCm: f.heightCm, name: f.name, poses, area };
    }
  }
  return {
    widthCm: best.widthCm,
    heightCm: best.heightCm,
    posesPerSheet: best.poses,
    formatName: best.name,
    bascule: false, // Bascule is operational; we don't change poses
  };
}

export interface CahierStructure {
  numCahiers: number;    // number of interior signatures (full + partial)
  pagesPerCahier: number; // pages per full signature
  totalSheets: number;   // total machine sheets for interior (excluding waste)
  cahiersCount: number;  // numCahiers + 1 (for cover) — used for binding tier lookup
  /**
   * Total interior plate count accounting for partial last cahier.
   * Example: 24p with 8 poses (16p/cahier) → 1 full (8 plates) + 1 half (4 plates) = 12 plates.
   * Use this instead of (numCahiers × platesPerSide × 2) to avoid overcounting.
   */
  totalPlatesInterior: number; // platesPerSide = 4 assumed here; multiply by actual later
}

/**
 * For offset printing, interior pages are grouped into cahiers (signatures).
 * Each cahier uses its own set of plates.
 * A partial last cahier uses proportionally fewer plates (rounded up to the
 * next even number of sides).
 *
 * Standard: 32 pages per cahier (16 poses per side × 2 sides)
 */
export function calcCahierStructure(
  pagesInterior: number,
  posesPerSheet: number,
  platesPerSide: number = 4,
): CahierStructure {
  const pagesPerCahier = posesPerSheet * 2; // pages per full 2-sided cahier
  const numCahiers = Math.ceil(pagesInterior / pagesPerCahier);
  const totalSheets = Math.ceil(pagesInterior / 2 / posesPerSheet);

  // Count plates accurately: full cahiers use platesPerSide*2; partial last cahier
  // uses ceil(remainder_pages / posesPerSheet) sides × platesPerSide.
  const fullCahiers = Math.floor(pagesInterior / pagesPerCahier);
  const remainderPages = pagesInterior - fullCahiers * pagesPerCahier;
  const lastCahierSides = remainderPages > 0
    ? Math.ceil(remainderPages / posesPerSheet) // 1 or 2 sides
    : 0;
  const platesFromFullCahiers = fullCahiers * platesPerSide * 2;
  const platesFromLastCahier = lastCahierSides * platesPerSide;
  const totalPlatesInterior = platesFromFullCahiers + platesFromLastCahier;

  return {
    numCahiers,
    pagesPerCahier,
    totalSheets,
    cahiersCount: numCahiers + 1, // +1 for cover
    totalPlatesInterior,
  };
}

/** Total machine sheets needed for a given quantity + waste */
export function calcSheetsWithWaste(
  baseSheets: number,
  numPressRuns: number,   // number of press setups (= cahiers + cover, NOT individual plates)
  gacheCalage: number,   // waste sheets per press run for calibration (70)
  gacheTiragePct: number, // running waste percentage (tiered: 0.002–0.008)
  gacheVernisSheets: number = 0  // extra waste for varnish: 2 sheets per plate when vernis used
): number {
  const wasteCalage = numPressRuns * gacheCalage;
  const wasteTirage = Math.ceil(baseSheets * gacheTiragePct);
  return baseSheets + wasteCalage + wasteTirage + gacheVernisSheets;
}
