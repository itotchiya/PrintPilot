/**
 * Packaging costs (conditionnement). XLSM: Mise sous film (tiered), cartons, palettes, élastiques, boîte cristal.
 */

import type { QuotePackaging } from "./types";

/** XLSM Tableau Façonnage OFFSET: film price per unit by pack size (units per pack) */
const FILM_TIERED_PER_UNIT: Record<number, number> = {
  1: 0.25,
  2: 0.17,
  3: 0.12,
  4: 0.10,
  10: 0.08,
};

/** Default packaging rates when no DB options (XLSM-aligned) */
const DEFAULTS = {
  filmPerUnit: 0.10,       // 4+ tier
  /** Excel: Cout_Cartons = ceil(Poids_Total_Kg / 10) × prix unitaire carton (~1.00 €) */
  cartonsKgPerCarton: 10,
  cartonsPricePerUnit: 1.0,
  cartonsMinCartons: 1,
  palettePerPalette: 10,   // Détails PRIX
  elastiquesMin: 5,        // Tarification Minimum 5
  elastiquesPerUnit: 0.01,
  crystalPerBox: 2.22,    // XLSM minimum per box
};

export interface PackagingOptionLike {
  type: string;
  costPerUnit: number;
  costPerOrder: number;
}

/**
 * Compute packaging cost from quote packaging choices and quantity.
 * Uses optional DB options when provided, else XLSM-based defaults.
 */
export function calcPackagingCost(
  packaging: QuotePackaging | null | undefined,
  quantity: number,
  weightTotalKg?: number,
  options?: PackagingOptionLike[]
): number {
  if (!packaging || quantity <= 0) return 0;
  let total = 0;

  const opt = (type: string) => options?.find(o => o.type.toLowerCase() === type.toLowerCase());

  // Mise sous film: tiered per unit (XLSM). Default 0.10 €/unit (4+ tier).
  if (packaging.film) {
    const filmOpt = opt("film");
    const rate = filmOpt ? toNum(filmOpt.costPerUnit) : DEFAULTS.filmPerUnit;
    total += quantity * rate;
  }

  // Cartons (mise en cartons): Cout_Cartons = ceil(Poids_Total_Kg / 10) × Prix_Unitaire_Carton (Excel ~1.00 €).
  if (packaging.cartons) {
    const cartonOpt = opt("cartons");
    const numCartons = weightTotalKg != null && weightTotalKg > 0
      ? Math.max(1, Math.ceil(weightTotalKg / DEFAULTS.cartonsKgPerCarton))
      : DEFAULTS.cartonsMinCartons;
    const perCarton = cartonOpt ? toNum(cartonOpt.costPerUnit) : DEFAULTS.cartonsPricePerUnit;
    total += numCartons * perCarton;

    // Palettes: always at least 1 palette when cartons are used; add 1 per 500 kg.
    // XLSM Détails_PRIX: palettes = 1, coût = 10 EUR/palette.
    const numPalettes = weightTotalKg != null && weightTotalKg > 500
      ? Math.ceil(weightTotalKg / 500)
      : 1;
    const paletteOpt = opt("palette");
    const perPalette = paletteOpt ? toNum(paletteOpt.costPerUnit) : DEFAULTS.palettePerPalette;
    total += numPalettes * perPalette;
  }

  // Palettes (standalone when cartons not requested but palette flag set):
  // Elastiques: minimum or per pack.
  if (packaging.elastiques) {
    const elOpt = opt("elastiques");
    const min = elOpt ? toNum(elOpt.costPerOrder) : DEFAULTS.elastiquesMin;
    const perU = elOpt ? toNum(elOpt.costPerUnit) : DEFAULTS.elastiquesPerUnit;
    total += Math.max(min, quantity * perU);
  }

  // Boîte cristal
  const crystalQty = packaging.crystalBoxQty ?? 0;
  if (crystalQty > 0) {
    const crystalOpt = opt("crystal");
    const perBox = crystalOpt ? toNum(crystalOpt.costPerUnit) : DEFAULTS.crystalPerBox;
    total += crystalQty * perBox;
  }

  return Math.round(total * 100) / 100;
}

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}
