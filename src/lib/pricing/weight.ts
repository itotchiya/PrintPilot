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
    interiorWeight = (interiorSheets * productArea * grammageInterior) / 9769;
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
      coverWeight = (coverArea * grammageCouvreture) / 9769;
    }
  }

  return interiorWeight + coverWeight;
}

/** Weight per delivery point in KG (minimum 1 kg) */
export function calcWeightPerPointKg(copies: number, weightPerCopyGrams: number): number {
  return Math.max(1, (copies * weightPerCopyGrams) / 1000);
}

/** Approximate spine thickness for brochures using perfect/PUR binding */
export function estimateSpineThicknessCm(pagesInterior: number, grammage: number): number {
  // Rule of thumb: (pages / 2) sheets × grammage(g/m²) / 1_000_000 × 1_000 × 20
  // Simplified: pages × grammage / 100000
  return (pagesInterior * grammage) / 100000;
}
