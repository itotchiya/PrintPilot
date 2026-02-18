import { calcPaperCostOffset } from "./paper";
import { calcSheetsWithWaste } from "./imposition";

export interface OffsetConfig {
  plateCost: number;                   // 9.90 EUR
  plateCostLarge: number;              // 17.40 EUR (for large format)
  calagePerPlate: number;              // 6.00 EUR
  calageVernis: number;                // 6.00 EUR
  rechercheTeintePerPlate: number;     // 10.00 EUR
  fileProcessingBase: number;          // 12.50 EUR
  fileProcessingPerPlate: number;      // 0.11 EUR
  gacheCalage: number;                 // 70 sheets
  gacheTiragePct: number;              // 0.02
  runningCostTier1: number;            // 25.00 EUR/1000 (≤1000)
  runningCostTier2: number;            // 16.00 EUR/1000 (≤3000)
  runningCostTier3: number;            // 15.00 EUR/1000 (≤5000)
  runningCostTier4: number;            // 15.00 EUR/1000 (≤10000)
  runningCostTier5: number;            // 15.00 EUR/1000 (>10000)
  paperMarginRate: number;             // 0.15
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

  // Lamination
  laminationMode: string;
  laminationConfig: OffsetLaminationConfig | null;

  // Folds (depliants)
  foldCount: number;
  foldCost: number;    // already looked up from FoldCost table

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
  packagingCost: number;
  subtotal: number;
  deliveryCost: number;
  margin: number;
  total: number;
}

function getRunningRate(sheets: number, cfg: OffsetConfig): number {
  if (sheets <= 1000) return cfg.runningCostTier1;
  if (sheets <= 3000) return cfg.runningCostTier2;
  if (sheets <= 5000) return cfg.runningCostTier3;
  if (sheets <= 10000) return cfg.runningCostTier4;
  return cfg.runningCostTier5;
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
    machineWidthCm, machineHeightCm, posesPerSheet,
    interiorPlatesPerSide, coverPlatesPerSide,
    bindingTypeName, bindingOffsetTiers, numCahiers, cahiersCount,
    laminationMode, laminationConfig, foldCost,
    config,
  } = input;

  const sides = rectoVerso ? 2 : 1;

  // --- Paper cost ---
  let paperCostInterior = 0;
  let paperCostCover = 0;

  if (hasCover) {
    const interiorBaseSheets = Math.ceil((pagesInterior / 2) * quantity / posesPerSheet);
    const numPlatesInterior = numCahiers * interiorPlatesPerSide * 2;
    const interiorSheetsWithWaste = calcSheetsWithWaste(interiorBaseSheets, numPlatesInterior, config.gacheCalage, config.gacheTiragePct);
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
      const coverSheetsWithWaste = calcSheetsWithWaste(coverBaseSheets, numPlatesCover, config.gacheCalage, config.gacheTiragePct);
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
    const flatSheetsWithWaste = calcSheetsWithWaste(flatBaseSheets, numPlates, config.gacheCalage, config.gacheTiragePct);
    paperCostInterior = calcPaperCostOffset({
      machineSheets: flatSheetsWithWaste,
      machineWidthCm, machineHeightCm,
      grammage: interiorGrammage,
      pricePerKg: interiorPricePerKg,
      paperMarginRate: config.paperMarginRate,
    });
  }

  // --- Plates ---
  const numPlatesInterior = hasCover ? numCahiers * interiorPlatesPerSide * 2 : interiorPlatesPerSide * sides;
  const numPlatesCover = hasCover ? coverPlatesPerSide * 2 : 0;
  const totalPlates = numPlatesInterior + numPlatesCover;
  const plateCost = totalPlates * config.plateCost;

  // --- Calibration ---
  const calageCost = totalPlates * config.calagePerPlate;

  // --- Running cost ---
  const totalSheets = hasCover
    ? Math.ceil((pagesInterior / 2) * quantity / posesPerSheet) + Math.ceil(quantity / posesPerSheet)
    : Math.ceil(quantity * sides / posesPerSheet);
  const runningRate = getRunningRate(totalSheets, config);
  const runningCost = (totalSheets / 1000) * runningRate;

  // --- File processing ---
  const fileProcessing = config.fileProcessingBase + totalPlates * config.fileProcessingPerPlate;

  // --- Binding cost ---
  let bindingCost = 0;
  if (hasCover && bindingTypeName) {
    const tier = findOffsetBindingTier(bindingOffsetTiers, cahiersCount);
    if (tier) {
      bindingCost = tier.calageCost + (quantity / 1000) * tier.roulagePer1000;
    }
  }

  // --- Lamination cost ---
  let laminationCostValue = 0;
  if (laminationMode !== "Rien" && laminationConfig) {
    const laminationWidthCm = hasCover ? openWidthCm : widthCm;
    const areaM2 = (laminationWidthCm * heightCm / 10000) * quantity;
    const multiplier = laminationMode === "Pelliculage Recto Verso" ? 2 : 1;
    const rawCost = laminationConfig.offsetCalageForfait + areaM2 * multiplier * laminationConfig.offsetPricePerM2;
    laminationCostValue = Math.max(laminationConfig.offsetMinimumBilling, rawCost);
  }

  const packagingCost = 0;
  const deliveryCost = 0; // Added by engine.ts

  const subtotal = paperCostInterior + paperCostCover + plateCost + calageCost
    + runningCost + fileProcessing + bindingCost + laminationCostValue + foldCost + packagingCost;
  const margin = subtotal * 0.07;
  const total = (subtotal + deliveryCost) * 1.07;

  return {
    paperCostInterior, paperCostCover,
    plateCost, calageCost, runningCost, fileProcessing,
    bindingCost, laminationCost: laminationCostValue, foldCost,
    packagingCost, subtotal, deliveryCost, margin, total,
  };
}
