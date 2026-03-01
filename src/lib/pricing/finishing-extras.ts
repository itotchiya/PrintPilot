/**
 * Finishing extras — CLAUDE.md §11 (UV Varnish), §12 (Encart), §13 (Recassage)
 * These are optional operations added to the offset calculation.
 * All costs are additive to the offset subtotal.
 */

// ── UV Varnish (§11) ────────────────────────────────────────────────────────
export interface UVVarnishInput {
  mode: "UV Brillant" | "UV Reserve" | null;
  machineWidthCm: number;
  machineHeightCm: number;
  quantity: number;
}

const UV_RATES = {
  // Rate per 1000 copies based on machine format
  smallFormat: { ratePerMille: 170, maxWidthCm: 50, maxHeightCm: 70 },
  largeFormat: { ratePerMille: 130 },
  // Forfait calage depends on area
  calageSmall: 160,  // < 35×50
  calageMedium: 260, // 35×50 to 50×70
  calageLarge: 350,  // > 50×70
};

export function calcUVVarnishCost(input: UVVarnishInput): number {
  if (!input.mode) return 0;

  const { machineWidthCm, machineHeightCm, quantity } = input;
  const isSmall = machineWidthCm <= UV_RATES.smallFormat.maxWidthCm
    && machineHeightCm <= UV_RATES.smallFormat.maxHeightCm;

  const ratePerMille = isSmall ? UV_RATES.smallFormat.ratePerMille : UV_RATES.largeFormat.ratePerMille;
  const runCost = (quantity / 1000) * ratePerMille;

  // Calage forfait based on sheet area
  const area = machineWidthCm * machineHeightCm;
  let calage: number;
  if (area < 35 * 50) {
    calage = UV_RATES.calageSmall;
  } else if (area <= 50 * 70) {
    calage = UV_RATES.calageMedium;
  } else {
    calage = UV_RATES.calageLarge;
  }

  return calage + runCost;
}

// ── Encart jeté (§12) ───────────────────────────────────────────────────────
export type EncartMode = "Aléatoire" | "Non aléatoire" | null;

const ENCART_RATES = {
  aleatoire: 37,      // €/1000 — random insert
  nonAleatoire: 50,   // €/1000 — positioned insert
};

export function calcEncartCost(mode: EncartMode, quantity: number): number {
  if (!mode) return 0;
  const rate = mode === "Aléatoire" ? ENCART_RATES.aleatoire : ENCART_RATES.nonAleatoire;
  return (quantity / 1000) * rate;
}

// ── Recassage (re-folding) (§13) ────────────────────────────────────────────
const RECASSAGE = {
  calage: 26,      // € forfait
  roulagePer1000: 13,
};

export function calcRecassageCost(enabled: boolean, quantity: number): number {
  if (!enabled) return 0;
  return RECASSAGE.calage + (quantity / 1000) * RECASSAGE.roulagePer1000;
}

// ── Ouvrage à rabats (§4.11) ────────────────────────────────────────────────
const RABAT_RATES = {
  oneFlap: 50,   // €/1000
  twoFlaps: 70,  // €/1000
};

export function calcRabatCost(numFlaps: number, quantity: number): number {
  if (numFlaps <= 0) return 0;
  const rate = numFlaps >= 2 ? RABAT_RATES.twoFlaps : RABAT_RATES.oneFlap;
  return (quantity / 1000) * rate;
}

// ── Combined extras calculator ──────────────────────────────────────────────
export interface FinishingExtrasInput {
  uvVarnish?: UVVarnishInput;
  encartMode?: EncartMode;
  recassageEnabled?: boolean;
  numFlaps?: number;
  quantity: number;
}

export interface FinishingExtrasBreakdown {
  uvVarnishCost: number;
  encartCost: number;
  recassageCost: number;
  rabatCost: number;
  total: number;
}

export function calcFinishingExtras(input: FinishingExtrasInput): FinishingExtrasBreakdown {
  const uvVarnishCost = input.uvVarnish ? calcUVVarnishCost(input.uvVarnish) : 0;
  const encartCost = calcEncartCost(input.encartMode ?? null, input.quantity);
  const recassageCost = calcRecassageCost(input.recassageEnabled ?? false, input.quantity);
  const rabatCost = calcRabatCost(input.numFlaps ?? 0, input.quantity);

  return {
    uvVarnishCost,
    encartCost,
    recassageCost,
    rabatCost,
    total: uvVarnishCost + encartCost + recassageCost + rabatCost,
  };
}
