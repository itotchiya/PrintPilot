import { calcPaperCostOffset } from "./paper";
import { calcSheetsWithWaste } from "./imposition";

export interface OffsetConfig {
  plateCost: number;                   // 11.00 EUR (XLSM)
  plateCostLarge: number;              // 17.40 EUR (for large format)
  calagePerPlate: number;              // 6.00 EUR
  calageVernis: number;                // 6.00 EUR
  rechercheTeintePerPlate: number;     // 10.00 EUR
  /** Flat fee per treatment (interior = 1, cover = 1); XLSM uses 12.50 per treatment, no per-plate */
  fileProcessingPerTreatment: number;  // 12.50 EUR
  fileProcessingBase: number;          // legacy fallback
  fileProcessingPerPlate: number;      // 0 (XLSM: no per-plate)
  gacheCalage: number;                 // 70 sheets
  gacheTiragePct: number;              // legacy flat rate fallback
  /** Tiered running waste (XLSM): ≤3k 0.2%, ≤5k 0.5%, ≤8k 0.6%, ≤10k 0.8% */
  gacheTiragePctTier3k: number;
  gacheTiragePctTier5k: number;
  gacheTiragePctTier8k: number;
  gacheTiragePctTier10k: number;
  gacheVernis: number;                 // 2 sheets per plate when vernis/lamination
  runningCostTier1: number;            // 25.00 EUR/1000 (≤1000)
  runningCostTier2: number;            // 16.00 EUR/1000 (≤3000)
  runningCostTier3: number;            // 15.00 EUR/1000 (≤5000)
  runningCostTier4: number;            // 15.00 EUR/1000 (≤10000)
  runningCostTier5: number;            // 15.00 EUR/1000 (≤12000)
  runningCostTier6: number;            // 15.00 EUR/1000 (>12000) XLSM 6th tier
  /** Varnish running cost per 1000 tours (Détails_PRIX_DEPLIANTS: 22 €/1000) */
  runningCostVernis?: number;
  paperMarginRate: number;             // 0.15 (XLSM)
}

export interface OffsetBindingTier {
  cahiersCount: number;
  calageCost: number;
  roulagePer1000: number;
}

export interface OffsetLaminationConfig {
  offsetPricePerM2: number;
  offsetCalageForfait: number;
  offsetMinimumBilling: number;
}

export interface OffsetInput {
  productType: "BROCHURE" | "DEPLIANT" | "FLYER" | "CARTE_DE_VISITE";
  quantity: number;
  widthCm: number;
  heightCm: number;
  openWidthCm: number;
  openHeightCm: number;
  pagesInterior: number;   // 0 for flat
  hasCover: boolean;
  rectoVerso: boolean;

  // Paper
  interiorPricePerKg: number;
  interiorGrammage: number;
  coverPricePerKg: number | null;
  coverGrammage: number | null;
  /** For binding surcharges: e.g. "Couché Satin", "Couché Mat" */
  interiorPaperTypeName?: string | null;
  coverPaperTypeName?: string | null;

  // Machine format
  machineWidthCm: number;
  machineHeightCm: number;
  posesPerSheet: number;

  // Color modes
  interiorPlatesPerSide: number; // e.g. 4 for CMYK
  coverPlatesPerSide: number;    // e.g. 4

  // Binding (brochures)
  bindingTypeName: string | null;
  bindingOffsetTiers: OffsetBindingTier[];
  numCahiers: number;
  cahiersCount: number;
  /**
   * Accurate total interior plate count (accounts for partial last cahier).
   * If not supplied, falls back to numCahiers × interiorPlatesPerSide × 2.
   */
  totalPlatesInterior?: number;

  // Lamination
  laminationMode: string;
  laminationConfig: OffsetLaminationConfig | null;

  // Folds (depliants)
  foldCount: number;
  foldCost: number;    // already looked up from FoldCost table

  /** Packaging cost (conditionnement) computed by engine from QuotePackaging */
  packagingCost: number;

  /** Cutting cost for flat products (depliant/flyer/carte) — per pose + per model */
  cuttingCost?: number;

  /** True when the COLOR MODE includes machine varnish (e.g. "Quadrichromie + Vernis Machine") */
  hasColorModeVarnish?: boolean;

  config: OffsetConfig;
}

export interface OffsetBreakdown {
  paperCostInterior: number;
  paperCostCover: number;
  plateCost: number;
  calageCost: number;
  runningCost: number;
  fileProcessing: number;
  bindingCost: number;
  laminationCost: number;
  foldCost: number;
  cuttingCost: number;
  packagingCost: number;
  subtotal: number;
  deliveryCost: number;
  margin: number;
  /** XLSM: taux de marque = 1 - (total coutant / prix de vente) */
  tauxDeMarque?: number;
  total: number;
}

/** XLSM tiered running waste: ≤3k 0.2%, ≤5k 0.5%, ≤8k 0.6%, ≤10k 0.8% */
function getGacheTiragePct(sheets: number, cfg: OffsetConfig): number {
  if (sheets <= 3000) return cfg.gacheTiragePctTier3k;
  if (sheets <= 5000) return cfg.gacheTiragePctTier5k;
  if (sheets <= 8000) return cfg.gacheTiragePctTier8k;
  if (sheets <= 10000) return cfg.gacheTiragePctTier10k;
  return cfg.gacheTiragePctTier10k; // same as max tier
}

function getRunningRate(sheets: number, cfg: OffsetConfig): number {
  if (sheets <= 1000) return cfg.runningCostTier1;
  if (sheets <= 3000) return cfg.runningCostTier2;
  if (sheets <= 5000) return cfg.runningCostTier3;
  if (sheets <= 10000) return cfg.runningCostTier4;
  if (sheets <= 12000) return cfg.runningCostTier5;
  return cfg.runningCostTier6;
}

function findOffsetBindingTier(tiers: OffsetBindingTier[], cahiersCount: number): OffsetBindingTier | null {
  const sorted = [...tiers].sort((a, b) => b.cahiersCount - a.cahiersCount);
  return sorted.find(t => t.cahiersCount <= cahiersCount) ?? null;
}

export function calcOffsetPrice(input: OffsetInput): OffsetBreakdown {
  const {
    quantity, widthCm, heightCm, openWidthCm,
    pagesInterior, hasCover, rectoVerso,
    interiorPricePerKg, interiorGrammage,
    coverPricePerKg, coverGrammage,
    interiorPaperTypeName, coverPaperTypeName,
    machineWidthCm, machineHeightCm, posesPerSheet,
    interiorPlatesPerSide, coverPlatesPerSide,
    bindingTypeName, bindingOffsetTiers, numCahiers, cahiersCount, totalPlatesInterior: totalPlatesInteriorIn,
    laminationMode, laminationConfig, foldCost,
    packagingCost = 0,
    config,
  } = input;

  const sides = rectoVerso ? 2 : 1;

  // --- Paper cost ---
  let paperCostInterior = 0;
  let paperCostCover = 0;

  const hasVernis = laminationMode !== "Rien";

  if (hasCover) {
    const interiorBaseSheets = Math.ceil((pagesInterior / 2) * quantity / posesPerSheet);
    // Use accurate plate count from cahier structure (accounts for partial last cahier)
    const numPlatesInterior = totalPlatesInteriorIn ?? numCahiers * interiorPlatesPerSide * 2;
    const gacheTirageInterior = getGacheTiragePct(interiorBaseSheets, config);
    const gacheVernisInterior = hasVernis ? numPlatesInterior * config.gacheVernis : 0;
    // Gâche calage is per PRESS RUN (cahier), not per plate. Each cahier = 1 press setup.
    const interiorPressRuns = numCahiers;
    const interiorSheetsWithWaste = calcSheetsWithWaste(interiorBaseSheets, interiorPressRuns, config.gacheCalage, gacheTirageInterior, gacheVernisInterior);
    paperCostInterior = calcPaperCostOffset({
      machineSheets: interiorSheetsWithWaste,
      machineWidthCm, machineHeightCm,
      grammage: interiorGrammage,
      pricePerKg: interiorPricePerKg,
      paperMarginRate: config.paperMarginRate,
    });

    if (coverGrammage && coverPricePerKg) {
      const coverBaseSheets = Math.ceil(quantity / posesPerSheet);
      const numPlatesCover = coverPlatesPerSide * 2;
      const gacheTirageCover = getGacheTiragePct(coverBaseSheets, config);
      const gacheVernisCover = hasVernis ? numPlatesCover * config.gacheVernis : 0;
      // Cover = 1 press run (front+back done in one pass)
      const coverPressRuns = 1;
      const coverSheetsWithWaste = calcSheetsWithWaste(coverBaseSheets, coverPressRuns, config.gacheCalage, gacheTirageCover, gacheVernisCover);
      paperCostCover = calcPaperCostOffset({
        machineSheets: coverSheetsWithWaste,
        machineWidthCm, machineHeightCm,
        grammage: coverGrammage,
        pricePerKg: coverPricePerKg,
        paperMarginRate: config.paperMarginRate,
      });
    }
  } else {
    const flatBaseSheets = Math.ceil(quantity / posesPerSheet);
    const numPlates = interiorPlatesPerSide * sides;
    const gacheTirageFlat = getGacheTiragePct(flatBaseSheets, config);
    const gacheVernisFlat = hasVernis ? numPlates * config.gacheVernis : 0;
    // Flat product: 1 press run per side (recto=1, recto-verso=2)
    const flatPressRuns = sides;
    const flatSheetsWithWaste = calcSheetsWithWaste(flatBaseSheets, flatPressRuns, config.gacheCalage, gacheTirageFlat, gacheVernisFlat);
    paperCostInterior = calcPaperCostOffset({
      machineSheets: flatSheetsWithWaste,
      machineWidthCm, machineHeightCm,
      grammage: interiorGrammage,
      pricePerKg: interiorPricePerKg,
      paperMarginRate: config.paperMarginRate,
    });
  }

  // --- Plates ---
  const numPlatesInterior = hasCover
    ? (totalPlatesInteriorIn ?? numCahiers * interiorPlatesPerSide * 2)
    : interiorPlatesPerSide * sides;
  const numPlatesCover = hasCover ? coverPlatesPerSide * 2 : 0;
  const totalPlates = numPlatesInterior + numPlatesCover;
  const plateCost = totalPlates * config.plateCost;

  // --- Calibration (add vernis calage when lamination) ---
  const calageCost = totalPlates * config.calagePerPlate;

  // --- Running cost ---
  const totalSheets = hasCover
    ? Math.ceil((pagesInterior / 2) * quantity / posesPerSheet) + Math.ceil(quantity / posesPerSheet)
    : Math.ceil(quantity * sides / posesPerSheet);
  const runningRate = getRunningRate(totalSheets, config);
  let runningCost = (totalSheets / 1000) * runningRate;
  // Varnish running cost: XLSM Tirage vernis = 22 €/1000 tours
  // Only applies when color mode includes machine varnish (5th plate), NOT for pelliculage
  if (input.hasColorModeVarnish && (config.runningCostVernis ?? 0) > 0) {
    runningCost += (totalSheets / 1000) * (config.runningCostVernis ?? 22);
  }

  // --- File processing: XLSM flat 12.50 per treatment (interior = 1, cover = 1) ---
  const numTreatments = hasCover ? 2 : 1;
  const fileProcessing = config.fileProcessingPerTreatment > 0
    ? config.fileProcessingPerTreatment * numTreatments
    : config.fileProcessingBase + totalPlates * config.fileProcessingPerPlate;

  // --- Binding cost with XLSM supplementary surcharges ---
  let bindingCost = 0;
  if (hasCover && bindingTypeName) {
    const tier = findOffsetBindingTier(bindingOffsetTiers, cahiersCount);
    if (tier) {
      bindingCost = tier.calageCost + (quantity / 1000) * tier.roulagePer1000;
      // Supplementary costs (XLSM Tableau Façonnage OFFSET): papier <70g +20%, couché satin >115g +5%, couché mat >115g +15%
      let surchargePct = 0;
      if (interiorGrammage < 70) surchargePct += 0.20;
      const name = (interiorPaperTypeName ?? "").toLowerCase();
      if (name.includes("satin") && interiorGrammage > 115) surchargePct += 0.05;
      if (name.includes("mat") && interiorGrammage > 115) surchargePct += 0.15;
      bindingCost *= 1 + surchargePct;
    }
  }

  // --- Lamination cost ---
  let laminationCostValue = 0;
  if (laminationMode !== "Rien" && laminationConfig) {
    const laminationWidthCm = openWidthCm || widthCm;
    const areaM2 = (laminationWidthCm * heightCm / 10000) * quantity;
    const multiplier = laminationMode === "Pelliculage Recto Verso" ? 2 : 1;
    const rawCost = laminationConfig.offsetCalageForfait + areaM2 * multiplier * laminationConfig.offsetPricePerM2;
    laminationCostValue = Math.max(laminationConfig.offsetMinimumBilling, rawCost);
  }

  const deliveryCost = 0; // Added by engine.ts

  const subtotal = paperCostInterior + paperCostCover + plateCost + calageCost
    + runningCost + fileProcessing + bindingCost + laminationCostValue + foldCost + (input.cuttingCost ?? 0) + packagingCost;
  const margin = subtotal * 0.07;
  const total = (subtotal + deliveryCost) * 1.07;
  const tauxDeMarque = total > 0 ? 1 - (subtotal + deliveryCost) / total : 0;

  return {
    paperCostInterior, paperCostCover,
    plateCost, calageCost, runningCost, fileProcessing,
    bindingCost, laminationCost: laminationCostValue, foldCost,
    cuttingCost: (input.cuttingCost ?? 0),
    packagingCost, subtotal, deliveryCost, margin, tauxDeMarque, total,
  };
}
