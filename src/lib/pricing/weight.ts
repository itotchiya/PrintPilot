/**
 * Weight calculation. When weightPer1000Sheets (at ref format) is provided (Tableau_papier lookup),
 * uses format scaling; otherwise divisor 9769 converts (cm² × g/m²) to grams.
 * Ref area aligned with Excel: 32.2×48.7 cm so wizard weight matches Excel (e.g. 193.45 g/ex for brochure).
 */
const REF_AREA_CM2 = 32.2 * 48.7;

export interface WeightInput {
  widthCm: number;
  heightCm: number;
  grammageInterior: number;        // g/m²
  grammageCouvreture: number | null; // g/m², null for flat products
  pagesInterior: number;           // 0 for flat products
  hasCover: boolean;
  spineThicknessCm: number;        // 0 if no cover
  /** Weight per 1000 sheets at ref format 32.2×48.7 cm (kg). When set, used with format scaling instead of formula. */
  weightPer1000SheetsInterior?: number | null;
  weightPer1000SheetsCover?: number | null;
}

/** Weight of a single copy in GRAMS */
export function calcWeightPerCopyGrams(input: WeightInput): number {
  const { widthCm, heightCm, grammageInterior, grammageCouvreture, pagesInterior, hasCover, spineThicknessCm, weightPer1000SheetsInterior, weightPer1000SheetsCover } = input;

  const productArea = widthCm * heightCm;
  const useLookupInterior = (weightPer1000SheetsInterior ?? 0) > 0;

  const interiorSheets = hasCover ? pagesInterior / 2 : 1;
  let interiorWeight: number;
  if (useLookupInterior) {
    const scale = productArea / REF_AREA_CM2;
    interiorWeight = interiorSheets * (weightPer1000SheetsInterior! / 1000) * scale * 1000;
  } else {
    // VBA: ((Format_Fini_L * Format_Fini_H / 10000) * (Pages/2) * Grammage)
    interiorWeight = (productArea / 10000) * interiorSheets * grammageInterior;
  }

  let coverWeight = 0;
  if (hasCover && grammageCouvreture) {
    const coverWidth = 2 * widthCm + spineThicknessCm;
    const coverArea = coverWidth * heightCm;
    const useLookupCover = (weightPer1000SheetsCover ?? 0) > 0;
    if (useLookupCover) {
      const scale = coverArea / REF_AREA_CM2;
      coverWeight = (weightPer1000SheetsCover! / 1000) * scale * 1000;
    } else {
      coverWeight = (coverArea / 10000) * grammageCouvreture;
    }
  }

  return interiorWeight + coverWeight;
}

/** Weight per delivery point in KG (minimum 1 kg) */
export function calcWeightPerPointKg(copies: number, weightPerCopyGrams: number): number {
  return Math.max(1, (copies * weightPerCopyGrams) / 1000);
}

/**
 * Spine thickness for brochures using perfect/PUR binding.
 * Uses XLSM lookup table (CLAUDE.md §5.7) which varies by paper type and grammage.
 * Returns thickness in centimeters.
 * 
 * The table gives mm-per-page for each paper category at each grammage.
 * Spine = (pagesInterior / 2) * mmPerPage / 10 (convert mm to cm)
 */

// mm per PAGE (single leaf = 2 pages) for each grammage, by paper type
const SPINE_THICKNESS_TABLE: Record<string, Record<number, number>> = {
  brillant: {
    80: 0.05, 90: 0.055, 100: 0.06, 115: 0.07, 130: 0.08,
    150: 0.09, 170: 0.105, 200: 0.125, 250: 0.155, 300: 0.19, 350: 0.22,
  },
  mat: {
    80: 0.055, 90: 0.06, 100: 0.065, 115: 0.075, 130: 0.085,
    150: 0.10, 170: 0.115, 200: 0.14, 250: 0.17, 300: 0.205, 350: 0.24,
  },
  satin: {
    80: 0.055, 90: 0.06, 100: 0.065, 115: 0.075, 130: 0.085,
    150: 0.10, 170: 0.115, 200: 0.14, 250: 0.17, 300: 0.205, 350: 0.24,
  },
  offset: {
    80: 0.06, 90: 0.065, 100: 0.075, 115: 0.085, 130: 0.095,
    150: 0.115, 170: 0.13, 200: 0.155, 250: 0.19, 300: 0.23, 350: 0.27,
  },
  recycle: {
    80: 0.065, 90: 0.07, 100: 0.08, 115: 0.09, 130: 0.10,
    150: 0.12, 170: 0.135, 200: 0.16, 250: 0.20, 300: 0.24, 350: 0.28,
  },
};

function findMMPerPage(paperTypeName: string | null, grammage: number): number | null {
  if (!paperTypeName) return null;
  const name = paperTypeName.toLowerCase()
    .replace(/[éè]/g, "e")
    .replace(/[ô]/g, "o");

  let category: string | null = null;
  if (name.includes("brillant")) category = "brillant";
  else if (name.includes("satin")) category = "satin";
  else if (name.includes("mat")) category = "mat";
  else if (name.includes("offset")) category = "offset";
  else if (name.includes("recycle") || name.includes("recyclé")) category = "recycle";

  if (!category) return null;

  const table = SPINE_THICKNESS_TABLE[category];
  const grammages = Object.keys(table).map(Number).sort((a, b) => a - b);

  // Exact match
  if (table[grammage] !== undefined) return table[grammage];

  // Linear interpolation between nearest grammages
  const lower = grammages.filter(g => g <= grammage).pop();
  const upper = grammages.find(g => g >= grammage);
  if (lower !== undefined && upper !== undefined && lower !== upper) {
    const ratio = (grammage - lower) / (upper - lower);
    return table[lower] + ratio * (table[upper] - table[lower]);
  }
  // Extrapolate from nearest
  if (lower !== undefined) return table[lower];
  if (upper !== undefined) return table[upper];
  return null;
}

export function estimateSpineThicknessCm(
  pagesInterior: number,
  grammage: number,
  paperTypeName?: string | null
): number {
  const mmPerPage = findMMPerPage(paperTypeName ?? null, grammage);
  if (mmPerPage !== null) {
    // pagesInterior = number of pages, /2 = number of leaves (sheets)
    return (pagesInterior / 2) * mmPerPage / 10; // mm → cm
  }
  // Fallback to original formula
  return (pagesInterior * grammage) / 100000;
}
