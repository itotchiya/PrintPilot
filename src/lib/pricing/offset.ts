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
  runningCostTier1: number;            // 15.00 EUR/1000 (≤1000, XLSM-corrected)
  runningCostTier2: number;            // 15.00 EUR/1000 (≤3000, XLSM-corrected)
  runningCostTier3: number;            // 15.00 EUR/1000 (≤5000)
  runningCostTier4: number;            // 15.00 EUR/1000 (≤10000)
  runningCostTier5: number;            // 15.00 EUR/1000 (≤12000)
  runningCostTier6: number;            // 15.00 EUR/1000 (>12000) XLSM 6th tier
  /** Varnish running cost per 1000 tours (XLSM: 20 €/1000, corrected from 22) */
  runningCostVernis?: number;
  fixedSetupFlat?: number; // Cout fixe for flat products (50 EUR)
  paperMarginRate: number;             // 0.10 (XLSM, corrected from 0.15)

  // Per-component discount rates (XLSM Détails PRIX remise system)
  // Applied as: final = base × (1 - discount). Default 0 = no discount.
  discountPlates?: number;       // 0.25 = 25% off plate costs
  discountCalage?: number;       // 0.10 = 10% off calage costs
  discountRoulage?: number;      // 0.10 = 10% off running costs
  discountFichiers?: number;     // 0.50 = 50% off file processing
  discountFaconnage?: number;    // 0.10 = 10% off binding/finishing
  discountPelliculage?: number;  // 0.00 = 0% off lamination
}

export interface OffsetBindingTier {
  cahiersCount: number;
  calageCost: number;
  roulagePer1000: number;
}

export interface OffsetBindingRules {
  supplement_grammage_min?: number;
  supplement_papier_lt70g?: number;
  supplement_couche_grammage_min?: number;
  supplement_couche_satin_gt115g?: number;
  supplement_couche_mat_gt115g?: number;
  supplement_1_encart?: number;
  supplement_2_encarts?: number;
  supplement_dos_min_mm?: number;
  supplement_dos_max_mm?: number;
  supplement_dos_hors_range?: number;
  supplement_cahiers_melanges?: number;
}

export interface OffsetLaminationConfig {
  offsetPricePerM2: number;
  offsetCalageForfait: number;
  offsetMinimumBilling: number;
}

// ── Rainage (creasing) cost table — CLAUDE.md §4.10 ──────────────────────────
const RAINAGE_TIERS: { cahiers: number; calage: number; roulagePer1000: number }[] = [
  { cahiers: 1, calage: 25, roulagePer1000: 17 },
  { cahiers: 2, calage: 25, roulagePer1000: 35 },
  { cahiers: 3, calage: 25, roulagePer1000: 45 },
  { cahiers: 4, calage: 25, roulagePer1000: 50 },
  { cahiers: 5, calage: 35, roulagePer1000: 75 },
  { cahiers: 6, calage: 35, roulagePer1000: 95 },
  { cahiers: 7, calage: 55, roulagePer1000: 120 },
];

/** Calculate rainage (creasing) cost based on number of cahiers and quantity. */
export function calcRainageCost(numCahiers: number, quantity: number): number {
  if (numCahiers <= 0) return 0;
  const tier = RAINAGE_TIERS.find(t => t.cahiers >= numCahiers) ?? RAINAGE_TIERS[RAINAGE_TIERS.length - 1];
  return tier.calage + (quantity / 1000) * tier.roulagePer1000;
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
  bindingRules?: OffsetBindingRules;
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

  /** Spine thickness in cm — used for binding supplement (dos <3mm or >35mm: +20%) */
  spineThicknessCm?: number;
  /** Number of encart (inserted) cahiers — 1: +5%, 2: +10% on binding */
  encartedCahiers?: number;
  /** Whether the brochure mixes cahiers and feuillets — if true: +20% on binding */
  hasMixedCahiers?: boolean;

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
  /** Binding supplement percentage applied (for display), e.g. "papier <70g +20%, couché mat >115g +15%" */
  bindingSurchargeDetail?: string;
  rainageCost: number;
  laminationCost: number;
  foldCost: number;
  cuttingCost: number;
  packagingCost: number;
  setupCostFlat?: number; // Added for flat products
  subtotal: number;
  deliveryCost: number;
  margin: number;
  /** XLSM: taux de marque = 1 - (total coutant / prix de vente) */
  tauxDeMarque?: number;
  total: number;
  
  // Batch Optimization Technical Output (Group B)
  techNbFeuillesInt?: number;
  techNbFeuillesPasseInt?: number;
  techNbPlaquesInt?: number;
  techNb1000Roule?: number;
  techNbCahiers?: number;
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
    bindingTypeName, bindingOffsetTiers, bindingRules, numCahiers, cahiersCount, totalPlatesInterior: totalPlatesInteriorIn,
    laminationMode, laminationConfig, foldCost,
    packagingCost = 0,
    config,
  } = input;

  const sides = rectoVerso ? 2 : 1;

  // --- Paper cost ---
  let paperCostInterior = 0;
  let paperCostCover = 0;

  // Track tech variables for Group B
  let techNbFeuillesInt = 0;
  let techNbFeuillesPasseInt = 0;

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
    
    techNbFeuillesInt = interiorBaseSheets;
    techNbFeuillesPasseInt = interiorSheetsWithWaste - interiorBaseSheets;

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
    
    techNbFeuillesInt = flatBaseSheets;
    techNbFeuillesPasseInt = flatSheetsWithWaste - flatBaseSheets;

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
  
  const unitPlateCost = (machineWidthCm >= 70 || machineHeightCm >= 100) ? config.plateCostLarge : config.plateCost;
  let plateCost = totalPlates * unitPlateCost;
  plateCost *= 1 - (config.discountPlates ?? 0);

  // --- Calibration (add vernis calage when lamination) ---
  let calageCost = totalPlates * config.calagePerPlate;
  calageCost *= 1 - (config.discountCalage ?? 0);

  // --- Running cost ---
  const totalSheets = hasCover
    ? Math.ceil((pagesInterior / 2) * quantity / posesPerSheet) + Math.ceil(quantity / posesPerSheet)
    : Math.ceil(quantity * sides / posesPerSheet);
  const runningRate = getRunningRate(totalSheets, config);
  let runningCost = (totalSheets / 1000) * runningRate;
  // Varnish running cost: XLSM Tirage vernis = 20 €/1000 tours
  // Only applies when color mode includes machine varnish (5th plate), NOT for pelliculage
  if (input.hasColorModeVarnish && (config.runningCostVernis ?? 0) > 0) {
    runningCost += (totalSheets / 1000) * (config.runningCostVernis ?? 20);
  }
  runningCost *= 1 - (config.discountRoulage ?? 0);

  // --- File processing: XLSM flat 12.50 per treatment (interior = 1, cover = 1) ---
  const numTreatments = hasCover ? 2 : 1;
  let fileProcessing = config.fileProcessingPerTreatment > 0
    ? config.fileProcessingPerTreatment * numTreatments
    : config.fileProcessingBase + totalPlates * config.fileProcessingPerPlate;
  fileProcessing *= 1 - (config.discountFichiers ?? 0);

  // --- Binding cost with XLSM supplementary surcharges (CLAUDE.md §4.9) ---
  let bindingCost = 0;
  let bindingSurchargeDetail = "";
  if (hasCover && bindingTypeName) {
    const tier = findOffsetBindingTier(bindingOffsetTiers, cahiersCount);
    if (tier) {
      bindingCost = tier.calageCost + (quantity / 1000) * tier.roulagePer1000;

      // All 7 XLSM binding supplements from Tableau Façonnage OFFSET:
      let surchargePct = 0;
      const surchargeReasons: string[] = [];

      // 1. Papier intérieur < 70g
      const limit1 = bindingRules?.supplement_grammage_min ?? 70;
      const rate1 = bindingRules?.supplement_papier_lt70g ?? 0.20;
      if (interiorGrammage < limit1) {
        surchargePct += rate1;
        surchargeReasons.push(`papier <${limit1}g +${rate1 * 100}%`);
      }
      // 2. Couché satin > 115g
      const limit2 = bindingRules?.supplement_couche_grammage_min ?? 115;
      const rateSatin = bindingRules?.supplement_couche_satin_gt115g ?? 0.05;
      const intName = (interiorPaperTypeName ?? "").toLowerCase();
      if (intName.includes("satin") && interiorGrammage > limit2) {
        surchargePct += rateSatin;
        surchargeReasons.push(`couché satin >${limit2}g +${rateSatin * 100}%`);
      }
      // 3. Couché mat > 115g
      const rateMat = bindingRules?.supplement_couche_mat_gt115g ?? 0.15;
      if (intName.includes("mat") && interiorGrammage > limit2) {
        surchargePct += rateMat;
        surchargeReasons.push(`couché mat >${limit2}g +${rateMat * 100}%`);
      }
      // 4. 1 cahier encarté à cheval
      const rateEncart1 = bindingRules?.supplement_1_encart ?? 0.05;
      if ((input.encartedCahiers ?? 0) === 1) {
        surchargePct += rateEncart1;
        surchargeReasons.push(`1 cahier encarté +${rateEncart1 * 100}%`);
      }
      // 5. 2 cahiers encartés
      const rateEncart2 = bindingRules?.supplement_2_encarts ?? 0.10;
      if ((input.encartedCahiers ?? 0) >= 2) {
        surchargePct += rateEncart2;
        surchargeReasons.push(`2+ cahiers encartés +${rateEncart2 * 100}%`);
      }
      // 6. Dos < 3mm or > 35mm
      const spine = input.spineThicknessCm ?? 0;
      const spineMm = spine * 10;
      const minSpine = bindingRules?.supplement_dos_min_mm ?? 3;
      const maxSpine = bindingRules?.supplement_dos_max_mm ?? 35;
      const rateSpine = bindingRules?.supplement_dos_hors_range ?? 0.20;
      if (spineMm > 0 && (spineMm < minSpine || spineMm > maxSpine)) {
        surchargePct += rateSpine;
        surchargeReasons.push(`dos ${spineMm.toFixed(1)}mm (hors ${minSpine}-${maxSpine}mm) +${rateSpine * 100}%`);
      }
      // 7. Cahiers/feuillets mélangés
      const rateMixed = bindingRules?.supplement_cahiers_melanges ?? 0.20;
      if (input.hasMixedCahiers) {
        surchargePct += rateMixed;
        surchargeReasons.push(`cahiers mélangés +${rateMixed * 100}%`);
      }

      // Use coverPaperTypeName for cover-specific checks
      const covName = (coverPaperTypeName ?? "").toLowerCase();
      if (covName.includes("mat") && (input.coverGrammage ?? 0) > limit2) {
        // Cover couché mat > 115g also adds +15% (same rule applies to cover)
        // Only add if not already counted from interior
        if (!intName.includes("mat") || interiorGrammage <= limit2) {
          surchargePct += rateMat;
          surchargeReasons.push(`couv. couché mat >${limit2}g +${rateMat * 100}%`);
        }
      }

      bindingCost *= 1 + surchargePct;
      bindingCost *= 1 - (config.discountFaconnage ?? 0);
      bindingSurchargeDetail = surchargeReasons.join(", ");
    }
  }

  // --- Rainage (creasing) cost (CLAUDE.md §4.10) ---
  const rainageCost = hasCover ? calcRainageCost(numCahiers, quantity) : 0;

  // --- Lamination cost ---
  let laminationCostValue = 0;
  if (laminationMode !== "Rien" && laminationConfig) {
    const laminationWidthCm = openWidthCm || widthCm;
    const areaM2 = (laminationWidthCm * heightCm / 10000) * quantity;
    const multiplier = laminationMode === "Pelliculage Recto Verso" ? 2 : 1;
    const rawCost = laminationConfig.offsetCalageForfait + areaM2 * multiplier * laminationConfig.offsetPricePerM2;
    laminationCostValue = Math.max(laminationConfig.offsetMinimumBilling, rawCost);
    laminationCostValue *= 1 - (config.discountPelliculage ?? 0);
  }

  const deliveryCost = 0; // Added by engine.ts

  let setupCostFlat = 0;
  if (!hasCover && (config.fixedSetupFlat ?? 0) > 0) {
    setupCostFlat = config.fixedSetupFlat ?? 0;
  }

  const subtotal = paperCostInterior + paperCostCover + plateCost + calageCost
    + runningCost + fileProcessing + bindingCost + rainageCost + laminationCostValue + foldCost + (input.cuttingCost ?? 0) + packagingCost + setupCostFlat;
  const margin = subtotal * 0.07;
  const total = (subtotal + deliveryCost) * 1.07;
  const tauxDeMarque = total > 0 ? 1 - (subtotal + deliveryCost) / total : 0;

  return {
    paperCostInterior, paperCostCover,
    plateCost, calageCost, runningCost, fileProcessing,
    bindingCost, bindingSurchargeDetail: bindingSurchargeDetail || undefined,
    rainageCost,
    laminationCost: laminationCostValue, foldCost,
    cuttingCost: (input.cuttingCost ?? 0),
    packagingCost,
    setupCostFlat,
    subtotal, deliveryCost, margin, tauxDeMarque, total,
    techNbFeuillesInt, 
    techNbFeuillesPasseInt, 
    techNbPlaquesInt: numPlatesInterior, 
    techNb1000Roule: totalSheets / 1000, 
    techNbCahiers: numCahiers,
  };
}
