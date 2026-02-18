/**
 * Paper cost calculation.
 * Prices are loaded from the database (PaperGrammage table).
 */

export interface PaperGrammageData {
  grammage: number;
  pricePerKg: number;
  weightPer1000Sheets: number | null; // at 33×48.7cm reference
}

export interface PaperCostDigitalInput {
  sheetsCount: number;          // number of machine sheets
  grammageData: PaperGrammageData;
}

/** Paper cost for digital printing (no margin applied) */
export function calcPaperCostDigital(input: PaperCostDigitalInput): number {
  const { sheetsCount, grammageData } = input;
  if (!grammageData.weightPer1000Sheets) return 0;
  const weightKg = (sheetsCount / 1000) * grammageData.weightPer1000Sheets;
  return weightKg * grammageData.pricePerKg;
}

export interface PaperCostOffsetInput {
  machineSheets: number;        // total sheets including waste
  machineWidthCm: number;       // e.g. 65
  machineHeightCm: number;      // e.g. 92
  grammage: number;             // g/m²
  pricePerKg: number;           // EUR/kg
  paperMarginRate: number;      // e.g. 0.15 for 15% margin
}

/** Paper cost for offset printing (with margin applied) */
export function calcPaperCostOffset(input: PaperCostOffsetInput): number {
  const { machineSheets, machineWidthCm, machineHeightCm, grammage, pricePerKg, paperMarginRate } = input;
  // Area in m²: width × height in cm → / 10000
  const sheetAreaM2 = (machineWidthCm * machineHeightCm) / 10000;
  const weightKg = machineSheets * sheetAreaM2 * grammage / 1000;
  const baseCost = weightKg * pricePerKg;
  return baseCost * (1 + paperMarginRate);
}
