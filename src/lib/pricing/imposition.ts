/**
 * Imposition = how many copies of the product fit on one machine sheet.
 * For offset printing on a 65×92 cm press sheet.
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

export interface CahierStructure {
  numCahiers: number;    // number of interior signatures
  pagesPerCahier: number; // pages per signature (typically 32)
  totalSheets: number;   // total machine sheets for interior (excluding waste)
  cahiersCount: number;  // numCahiers + 1 (for cover) — used for binding tier lookup
}

/**
 * For offset printing, interior pages are grouped into cahiers (signatures).
 * Each cahier uses its own set of plates.
 *
 * Standard: 32 pages per cahier (16 poses per side × 2 sides)
 */
export function calcCahierStructure(
  pagesInterior: number,
  posesPerSheet: number,
): CahierStructure {
  const pagesPerCahier = posesPerSheet * 2; // both sides
  const numCahiers = Math.ceil(pagesInterior / pagesPerCahier);
  const totalSheets = Math.ceil(pagesInterior / 2 / posesPerSheet);
  return {
    numCahiers,
    pagesPerCahier,
    totalSheets,
    cahiersCount: numCahiers + 1, // +1 for cover
  };
}

/** Total machine sheets needed for a given quantity + waste */
export function calcSheetsWithWaste(
  baseSheets: number,
  numPlates: number,
  gacheCalage: number,   // waste sheets per plate for calibration (70)
  gacheTiragePct: number // running waste percentage (0.02)
): number {
  const wasteCalage = numPlates * gacheCalage;
  const wasteTirage = Math.ceil(baseSheets * gacheTiragePct);
  return baseSheets + wasteCalage + wasteTirage;
}
