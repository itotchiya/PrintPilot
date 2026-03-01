import { calcPaperCostDigital } from "./paper";
import type { PaperGrammageData } from "./paper";

export interface DigitalConfig {
  colorClickRate: number;   // EUR per color click (0.03 XLSM)
  monoClickRate: number;    // EUR per mono click (0.0065 XLSM)
  setupColor: number;       // EUR (0 in XLSM — no digital setup)
  setupMono: number;        // EUR (0 in XLSM)
  fileProcessing: number;  // EUR flat fee brochures (45)
  fileProcessingFlat?: number; // EUR flat fee depliants/flyers (10)
  setupDivisor: number;     // divisor for setup cost formula (unused when setup=0)
  /** XLSM: (paper + clicks) × multiplier + other costs. 0 = use legacy sum + margin */
  digitalMarkupMultiplier?: number; // 1.50
  /** Minimum billing for flat products (depliants/flyers) in EUR */
  minimumBillingFlat?: number; // 25
  /** Cutting: cost per pose (form) in EUR */
  cuttingCostPerPose?: number; // 0.85
  /** Cutting: cost per model in EUR */
  cuttingCostPerModel?: number; // 1.25
}

export interface FormatClickDivisor {
  formatName: string;       // e.g. "21x29.7"
  divisorRecto: number;
  divisorRectoVerso: number;
}

export interface DigitalBindingTier {
  pageRangeMin: number;
  pageRangeMax: number;
  qtyMin: number;
  qtyMax: number;
  perUnitCost: number;
  setupCost: number;
}

export interface LaminationPriceTier {
  qtyMin: number;
  qtyMax: number;
  pricePerSheet: number;
  setupCost: number;
}

// ── Digital fold cost table (Tableau_Façonnage_Num) ──────────────────────────
// Structure: { plis: { fixe, tiers: [{ maxQty, perUnit }] } }
const DIGITAL_FOLD_TABLE: Record<number, { fixe: number; tiers: { maxQty: number; perUnit: number }[] }> = {
  1: { fixe: 18, tiers: [{ maxQty: 100, perUnit: 0.050 }, { maxQty: 250, perUnit: 0.050 }, { maxQty: 500, perUnit: 0.040 }, { maxQty: 1000, perUnit: 0.009 }, { maxQty: Infinity, perUnit: 0.007 }] },
  2: { fixe: 26, tiers: [{ maxQty: 100, perUnit: 0.060 }, { maxQty: 250, perUnit: 0.060 }, { maxQty: 500, perUnit: 0.048 }, { maxQty: 1000, perUnit: 0.0108 }, { maxQty: Infinity, perUnit: 0.0084 }] },
  3: { fixe: 33, tiers: [{ maxQty: 100, perUnit: 0.072 }, { maxQty: 250, perUnit: 0.072 }, { maxQty: 500, perUnit: 0.0576 }, { maxQty: 1000, perUnit: 0.01296 }, { maxQty: Infinity, perUnit: 0.01008 }] },
  4: { fixe: 37, tiers: [{ maxQty: 100, perUnit: 0.0864 }, { maxQty: 250, perUnit: 0.0864 }, { maxQty: 500, perUnit: 0.06912 }, { maxQty: 1000, perUnit: 0.01555 }, { maxQty: Infinity, perUnit: 0.01210 }] },
};

// ── Digital brochure cutting cost table (Tableau_Façonnage_Num) ───────────────
// Applied to brochures after collation/stapling.
const DIGITAL_BROCHURE_CUT_TABLE = {
  fixe: 10,
  tiers: [
    { maxQty: 100,      perUnit: 0.07 },
    { maxQty: 200,      perUnit: 0.06 },
    { maxQty: 300,      perUnit: 0.05 },
    { maxQty: 400,      perUnit: 0.04 },
    { maxQty: Infinity, perUnit: 0.03 },
  ],
};

function calcDigitalFoldCost(numFolds: number, quantity: number): number {
  if (numFolds <= 0) return 0;
  const tableRow = DIGITAL_FOLD_TABLE[Math.min(numFolds, 4)];
  if (!tableRow) return 0;
  const tier = tableRow.tiers.find(t => quantity <= t.maxQty) ?? tableRow.tiers[tableRow.tiers.length - 1];
  return tableRow.fixe + quantity * tier.perUnit;
}

function calcDigitalBrochureCutCost(quantity: number): number {
  const tier = DIGITAL_BROCHURE_CUT_TABLE.tiers.find(t => quantity <= t.maxQty)
    ?? DIGITAL_BROCHURE_CUT_TABLE.tiers[DIGITAL_BROCHURE_CUT_TABLE.tiers.length - 1];
  return DIGITAL_BROCHURE_CUT_TABLE.fixe + quantity * tier.perUnit;
}

export interface DigitalInput {
  // Product
  productType: "BROCHURE" | "DEPLIANT" | "FLYER" | "CARTE_DE_VISITE";
  quantity: number;
  widthCm: number;
  heightCm: number;
  pagesInterior: number;   // 0 for flat
  hasCover: boolean;
  rectoVerso: boolean;
  /** Number of folds (for flat products like depliants) */
  foldCount?: number;

  // Paper
  interiorGrammageData: PaperGrammageData;
  coverGrammageData: PaperGrammageData | null;

  // Color
  colorModeName: string;     // "Quadrichromie", "Noir", etc.
  colorModePlatesPerSide: number;  // 4 for CMYK, 1 for Noir, 2 for Bichromie

  bindingTypeName: string | null;
  bindingDigitalTiers: DigitalBindingTier[];
  bindingRules?: unknown;

  // Lamination
  laminationMode: string;  // "Rien", "Pelliculage Recto", "Pelliculage Recto Verso"
  laminationTiers: LaminationPriceTier[];

  // Config
  config: DigitalConfig;
  clickDivisors: FormatClickDivisor[];
  /** Number of models (for cutting cost); flat products only */
  numModels?: number;
  /** Number of poses/forms (for cutting cost); flat products only */
  numPoses?: number;
  /** Packaging cost (conditionnement) from engine */
  packagingCost?: number;
}

export interface DigitalBreakdown {
  clickCostInterior: number;
  clickCostCover: number;
  paperCostInterior: number;
  paperCostCover: number;
  setupCost: number;
  fileProcessing: number;
  bindingCost: number;
  laminationCost: number;
  cuttingCost: number;
  foldCost: number;
  packagingCost: number;
  /** When using XLSM model: (paper + clicks) × 1.50 */
  paperAndClicksMarkedUp: number;
  subtotal: number;
  deliveryCost: number;
  margin: number;
  total: number;
}

/** Exported for engine: get format divisors for calculation snapshot formulas. */
export function getClickDivisorForFormat(
  divisors: FormatClickDivisor[],
  widthCm: number,
  heightCm: number
): { recto: number; rv: number } {
  return findClickDivisor(divisors, widthCm, heightCm);
}

function findClickDivisor(divisors: FormatClickDivisor[], widthCm: number, heightCm: number): { recto: number; rv: number } {
  // Match by approximate dimensions
  const formatKey = `${widthCm}x${heightCm}`;
  const match = divisors.find(d =>
    d.formatName === formatKey ||
    d.formatName === `${heightCm}x${widthCm}` // landscape variant
  );
  if (match) return { recto: match.divisorRecto, rv: match.divisorRectoVerso };

  // Fallback: A4 (21x29.7)
  const a4 = divisors.find(d => d.formatName === "21x29.7");
  return a4 ? { recto: a4.divisorRecto, rv: a4.divisorRectoVerso } : { recto: 2, rv: 1 };
}

function calcClicksFlat(divisors: FormatClickDivisor[], widthCm: number, heightCm: number, quantity: number, rectoVerso: boolean): number {
  const { recto, rv } = findClickDivisor(divisors, widthCm, heightCm);
  return rectoVerso ? quantity / rv : quantity / recto;
}

function calcClicksInterior(divisors: FormatClickDivisor[], widthCm: number, heightCm: number, pages: number, quantity: number): number {
  const { rv } = findClickDivisor(divisors, widthCm, heightCm);
  // Interior is always recto-verso
  return (pages * quantity) / (rv * 2);
}

function calcClicksCover(divisors: FormatClickDivisor[], widthCm: number, heightCm: number, quantity: number): number {
  const { rv } = findClickDivisor(divisors, widthCm, heightCm);
  // Cover = 4 pages = 2 sheets recto-verso
  return (4 * quantity) / (rv * 2);
}

/** Exported for engine: get click counts used in digital pricing (for calculation snapshot). */
export function getDigitalClicks(input: DigitalInput): { clicksInterior: number; clicksCover: number; clicksFlat?: number } {
  const { widthCm, heightCm, pagesInterior, quantity, hasCover, rectoVerso, clickDivisors } = input;
  if (hasCover) {
    return {
      clicksInterior: calcClicksInterior(clickDivisors, widthCm, heightCm, pagesInterior, quantity),
      clicksCover: calcClicksCover(clickDivisors, widthCm, heightCm, quantity),
    };
  }
  return {
    clicksInterior: calcClicksFlat(clickDivisors, widthCm, heightCm, quantity, rectoVerso),
    clicksCover: 0,
    clicksFlat: calcClicksFlat(clickDivisors, widthCm, heightCm, quantity, rectoVerso),
  };
}

function calcClickCost(clicks: number, platesPerSide: number, config: DigitalConfig): number {
  const isColor = platesPerSide >= 4;
  const rate = isColor ? config.colorClickRate : config.monoClickRate;
  return clicks * rate;
}

function findDigitalBindingTier(
  tiers: DigitalBindingTier[],
  pages: number,
  quantity: number
): DigitalBindingTier | null {
  return tiers.find(t =>
    pages >= t.pageRangeMin && pages <= t.pageRangeMax &&
    quantity >= t.qtyMin && quantity <= t.qtyMax
  ) ?? null;
}

function findLaminationTier(tiers: LaminationPriceTier[], quantity: number): LaminationPriceTier | null {
  return tiers.find(t => quantity >= t.qtyMin && quantity <= t.qtyMax) ?? null;
}

export function calcDigitalPrice(input: DigitalInput): DigitalBreakdown {
  const { quantity, widthCm, heightCm, pagesInterior, hasCover, rectoVerso,
    interiorGrammageData, coverGrammageData,
    colorModePlatesPerSide, bindingTypeName, bindingDigitalTiers,
    laminationMode, laminationTiers, config, clickDivisors,
    foldCount = 0,
    numModels = 1, numPoses = 1 } = input;

  // --- Clicks and Sheets ---
  let clicksInterior = 0;
  let clicksCover = 0;
  let sheetsInterior = 0;
  let sheetsCover = 0;

  const divIterior = getClickDivisorForFormat(clickDivisors, widthCm, heightCm);
  
  if (hasCover) {
    clicksInterior = calcClicksInterior(clickDivisors, widthCm, heightCm, pagesInterior, quantity);
    clicksCover = calcClicksCover(clickDivisors, widthCm, heightCm, quantity);
    sheetsInterior = (pagesInterior / 2) * (quantity / (divIterior.recto || 1));
    sheetsCover = quantity / (divIterior.recto || 1);
  } else {
    clicksInterior = calcClicksFlat(clickDivisors, widthCm, heightCm, quantity, rectoVerso);
    sheetsInterior = quantity / (divIterior.recto || 1);
  }

  // --- Click costs (XLSM rates: 0.03 color, 0.0065 mono) ---
  const clickCostInterior = calcClickCost(clicksInterior, colorModePlatesPerSide, config);
  const clickCostCover = hasCover ? calcClickCost(clicksCover, 4, config) : 0; // cover always CMYK

  // --- Paper costs ---
  // Paper uses actual sheets, not clicks (clicks can be double for RV!)
  const paperCostInterior = calcPaperCostDigital({ sheetsCount: sheetsInterior, grammageData: interiorGrammageData });
  const paperCostCover = (hasCover && coverGrammageData)
    ? calcPaperCostDigital({ sheetsCount: sheetsCover, grammageData: coverGrammageData })
    : 0;

  // --- Setup cost: XLSM has no digital setup (0) ---
  const setupCost = config.setupDivisor > 0 && (config.setupColor > 0 || config.setupMono > 0)
    ? (config.setupColor + config.setupMono) / config.setupDivisor
    : 0;

  // --- File processing (frais de dossiers): 45 brochures, 10 flat ---
  const fileProcessing = quantity > 0
    ? (hasCover ? config.fileProcessing : (config.fileProcessingFlat ?? config.fileProcessing))
    : 0;

  // --- Binding cost: XLSM Piqûre <200: calage 35 + qty×0.28; ≥200: calage 25 + qty×0.24 ---
  let bindingCost = 0;
  if (hasCover && bindingTypeName) {
    if (bindingTypeName === "Piqure" || bindingTypeName === "Piqûre") {
      if (quantity >= 200) bindingCost = 25 + quantity * 0.24;
      else bindingCost = 35 + quantity * 0.28;
    } else {
      const tier = findDigitalBindingTier(bindingDigitalTiers, pagesInterior, quantity);
      if (tier) bindingCost = tier.setupCost + quantity * tier.perUnitCost;
    }
  }

  // --- Lamination cost ---
  let laminationCost = 0;
  if (laminationMode !== "Rien") {
    const laminationSheets = hasCover ? sheetsCover : sheetsInterior;
    const multiplier = laminationMode === "Pelliculage Recto Verso" ? 2 : 1;
    const totalSheets = laminationSheets * multiplier;
    const tier = findLaminationTier(laminationTiers, totalSheets);
    if (tier) laminationCost = tier.setupCost + totalSheets * tier.pricePerSheet;
  }

  // --- Digital fold cost (flat products: depliants) ---
  // Uses Tableau_Façonnage_Num tiered per-unit costs + fixed setup
  const foldCost = !hasCover && foldCount > 0 ? calcDigitalFoldCost(foldCount, quantity) : 0;

  // --- Cutting cost ---
  // Flat products: per pose + per model (existing model)
  // Brochures: tiered per-unit + 10 EUR fixed (Tableau_Façonnage_Num "Prix coupe")
  let cuttingCost = 0;
  if (!hasCover && ((config.cuttingCostPerPose ?? 0) > 0 || (config.cuttingCostPerModel ?? 0) > 0)) {
    cuttingCost = (numPoses || 1) * (config.cuttingCostPerPose ?? 0) + (numModels || 1) * (config.cuttingCostPerModel ?? 0);
  } else if (hasCover) {
    cuttingCost = calcDigitalBrochureCutCost(quantity);
  }

  const packagingCostInput = input.packagingCost ?? 0;
  const deliveryCost = 0;  // Added by engine.ts

  const paperAndClicks = paperCostInterior + paperCostCover + clickCostInterior + clickCostCover;
  const otherCosts = setupCost + fileProcessing + bindingCost + laminationCost + cuttingCost + foldCost + packagingCostInput;

  // XLSM model: (paper + clicks) × 1.50 + other costs; brochures can use no markup to match Excel.
  const multiplier = config.digitalMarkupMultiplier ?? 0;
  const applyMarkupToBrochures = false; // Excel brochure numérique: subtotal = paper+clics+other (no ×1.50)
  const useMarkupHere = multiplier > 0 && (!input.hasCover || applyMarkupToBrochures);
  const paperAndClicksMarkedUp = useMarkupHere ? paperAndClicks * multiplier : paperAndClicks;
  let subtotal = useMarkupHere ? paperAndClicksMarkedUp + otherCosts : paperAndClicks + otherCosts;

  // Minimum billing for flat products (depliants/flyers)
  const minFlat = !hasCover ? (config.minimumBillingFlat ?? 0) : 0;
  if (minFlat > 0 && subtotal < minFlat) subtotal = minFlat;

  const margin = useMarkupHere ? 0 : subtotal * 0.05; // legacy margin when not using markup
  const total = (subtotal + deliveryCost) * (useMarkupHere ? 1 : 1.05);

  return {
    clickCostInterior, clickCostCover,
    paperCostInterior, paperCostCover,
    setupCost, fileProcessing,
    bindingCost, laminationCost, cuttingCost, foldCost, packagingCost: packagingCostInput,
    paperAndClicksMarkedUp: useMarkupHere ? paperAndClicksMarkedUp : 0,
    subtotal, deliveryCost, margin, total,
  };
}
