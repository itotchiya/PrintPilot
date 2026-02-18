/**
 * Weight calculation constants and functions.
 * The divisor 9769 converts (cm² × g/m²) to grams.
 */

export interface WeightInput {
  widthCm: number;
  heightCm: number;
  grammageInterior: number;        // g/m²
  grammageCouvreture: number | null; // g/m², null for flat products
  pagesInterior: number;           // 0 for flat products
  hasCover: boolean;
  spineThicknessCm: number;        // 0 if no cover
}

/** Weight of a single copy in GRAMS */
export function calcWeightPerCopyGrams(input: WeightInput): number {
  const { widthCm, heightCm, grammageInterior, grammageCouvreture, pagesInterior, hasCover, spineThicknessCm } = input;

  // Interior weight (for brochures: pages/2 sheets; for flat: 1 sheet)
  const interiorSheets = hasCover ? pagesInterior / 2 : 1;
  const interiorWeight = interiorSheets * widthCm * heightCm * grammageInterior;

  // Cover weight (only brochures)
  let coverWeight = 0;
  if (hasCover && grammageCouvreture) {
    // Cover wraps around: width = 2×width + spine
    const coverWidth = 2 * widthCm + spineThicknessCm;
    coverWeight = coverWidth * heightCm * grammageCouvreture;
  }

  return (interiorWeight + coverWeight) / 9769;
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
