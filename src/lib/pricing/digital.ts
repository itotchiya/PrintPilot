import { calcPaperCostDigital } from "./paper";
import type { PaperGrammageData } from "./paper";

export interface DigitalConfig {
  colorClickRate: number;   // EUR per color click (0.035)
  monoClickRate: number;    // EUR per mono click (0.007)
  setupColor: number;       // EUR (80)
  setupMono: number;        // EUR (15)
  fileProcessing: number;   // EUR flat fee (45)
  setupDivisor: number;     // divisor for setup cost formula (3000)
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

export interface DigitalInput {
  // Product
  productType: "BROCHURE" | "DEPLIANT" | "FLYER" | "CARTE_DE_VISITE";
  quantity: number;
  widthCm: number;
  heightCm: number;
  pagesInterior: number;   // 0 for flat
  hasCover: boolean;
  rectoVerso: boolean;

  // Paper
  interiorGrammageData: PaperGrammageData;
  coverGrammageData: PaperGrammageData | null;

  // Color
  colorModeName: string;     // "Quadrichromie", "Noir", etc.
  colorModePlatesPerSide: number;  // 4 for CMYK, 1 for Noir, 2 for Bichromie

  // Binding (brochures)
  bindingTypeName: string | null;
  bindingDigitalTiers: DigitalBindingTier[];

  // Lamination
  laminationMode: string;  // "Rien", "Pelliculage Recto", "Pelliculage Recto Verso"
  laminationTiers: LaminationPriceTier[];

  // Config
  config: DigitalConfig;
  clickDivisors: FormatClickDivisor[];
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
  packagingCost: number;
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
    laminationMode, laminationTiers, config, clickDivisors } = input;

  // --- Clicks ---
  let clicksInterior = 0;
  let clicksCover = 0;

  if (hasCover) {
    clicksInterior = calcClicksInterior(clickDivisors, widthCm, heightCm, pagesInterior, quantity);
    clicksCover = calcClicksCover(clickDivisors, widthCm, heightCm, quantity);
  } else {
    clicksInterior = calcClicksFlat(clickDivisors, widthCm, heightCm, quantity, rectoVerso);
  }

  // --- Click costs ---
  const clickCostInterior = calcClickCost(clicksInterior, colorModePlatesPerSide, config);
  const clickCostCover = hasCover ? calcClickCost(clicksCover, 4, config) : 0; // cover always CMYK

  // --- Paper costs ---
  const paperCostInterior = calcPaperCostDigital({ sheetsCount: clicksInterior, grammageData: interiorGrammageData });
  const paperCostCover = (hasCover && coverGrammageData)
    ? calcPaperCostDigital({ sheetsCount: clicksCover, grammageData: coverGrammageData })
    : 0;

  // --- Setup cost ---
  const setupCost = (config.setupColor + config.setupMono) / config.setupDivisor;
  const fileProcessing = quantity > 0 ? config.fileProcessing : 0;

  // --- Binding cost ---
  let bindingCost = 0;
  if (hasCover && bindingTypeName) {
    if (bindingTypeName === "Piqure") {
      if (quantity >= 200) bindingCost = quantity * 0.23 + 10;
      else bindingCost = quantity * 0.25 + 30;
    } else {
      // Dos carre tiers
      const tier = findDigitalBindingTier(bindingDigitalTiers, pagesInterior, quantity);
      if (tier) bindingCost = tier.setupCost + quantity * tier.perUnitCost;
    }
  }

  // --- Lamination cost ---
  let laminationCost = 0;
  if (laminationMode !== "Rien") {
    // For lamination, sheet count = cover sheets (or flat sheets)
    const laminationSheets = hasCover ? clicksCover : clicksInterior;
    const multiplier = laminationMode === "Pelliculage Recto Verso" ? 2 : 1;
    const totalSheets = laminationSheets * multiplier;
    const tier = findLaminationTier(laminationTiers, totalSheets);
    if (tier) laminationCost = tier.setupCost + totalSheets * tier.pricePerSheet;
  }

  const packagingCost = 0; // TODO: implement packaging cost if needed
  const deliveryCost = 0;  // Added by engine.ts

  const subtotal = clickCostInterior + clickCostCover + paperCostInterior + paperCostCover
    + setupCost + fileProcessing + bindingCost + laminationCost + packagingCost;
  const margin = subtotal * 0.05; // 5% — actual rate from config, applied by engine
  const total = (subtotal + deliveryCost) * 1.05;

  return {
    clickCostInterior, clickCostCover,
    paperCostInterior, paperCostCover,
    setupCost, fileProcessing,
    bindingCost, laminationCost, packagingCost,
    subtotal, deliveryCost, margin, total,
  };
}
