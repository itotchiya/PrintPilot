import { describe, it, expect } from "vitest";
import { calcRainageCost, calcOffsetPrice } from "../offset";
import type { OffsetInput, OffsetConfig } from "../offset";

// ── Shared test config ──────────────────────────────────────────────────────
const BASE_CONFIG: OffsetConfig = {
  plateCost: 11,
  plateCostLarge: 17.40,
  calagePerPlate: 6,
  calageVernis: 6,
  rechercheTeintePerPlate: 10,
  fileProcessingPerTreatment: 12.50,
  fileProcessingBase: 12.50,
  fileProcessingPerPlate: 0,
  gacheCalage: 70,
  gacheTiragePct: 0.02,
  gacheTiragePctTier3k: 0.002,
  gacheTiragePctTier5k: 0.005,
  gacheTiragePctTier8k: 0.006,
  gacheTiragePctTier10k: 0.008,
  gacheVernis: 2,
  runningCostTier1: 25,
  runningCostTier2: 16,
  runningCostTier3: 15,
  runningCostTier4: 15,
  runningCostTier5: 15,
  runningCostTier6: 15,
  runningCostVernis: 22,
  paperMarginRate: 0.15,
};

function makeInput(overrides: Partial<OffsetInput> = {}): OffsetInput {
  return {
    productType: "FLYER",
    quantity: 1000,
    widthCm: 21,
    heightCm: 29.7,
    openWidthCm: 21,
    openHeightCm: 29.7,
    pagesInterior: 0,
    hasCover: false,
    rectoVerso: true,
    interiorPricePerKg: 1.0,
    interiorGrammage: 90,
    coverPricePerKg: null,
    coverGrammage: null,
    interiorPaperTypeName: null,
    coverPaperTypeName: null,
    machineWidthCm: 65,
    machineHeightCm: 92,
    posesPerSheet: 4,
    interiorPlatesPerSide: 4,
    coverPlatesPerSide: 4,
    bindingTypeName: null,
    bindingOffsetTiers: [],
    numCahiers: 0,
    cahiersCount: 0,
    laminationMode: "Rien",
    laminationConfig: null,
    foldCount: 0,
    foldCost: 0,
    packagingCost: 0,
    config: BASE_CONFIG,
    ...overrides,
  };
}

// ── Rainage cost tests ──────────────────────────────────────────────────────
describe("calcRainageCost", () => {
  it("returns 0 for 0 cahiers", () => {
    expect(calcRainageCost(0, 1000)).toBe(0);
  });

  it("1 cahier: calage=25 + 17/1000", () => {
    expect(calcRainageCost(1, 1000)).toBe(25 + 17);
  });

  it("3 cahiers: calage=25 + 45/1000", () => {
    expect(calcRainageCost(3, 2000)).toBe(25 + 2 * 45);
  });

  it("7 cahiers: calage=55 + 120/1000", () => {
    expect(calcRainageCost(7, 5000)).toBe(55 + 5 * 120);
  });

  it("8+ cahiers uses max tier (7)", () => {
    expect(calcRainageCost(10, 1000)).toBe(55 + 120);
  });
});

// ── Binding supplements tests ───────────────────────────────────────────────
describe("calcOffsetPrice binding supplements", () => {
  const brochureInput = (overrides: Partial<OffsetInput> = {}) =>
    makeInput({
      productType: "BROCHURE",
      pagesInterior: 32,
      hasCover: true,
      rectoVerso: true,
      interiorGrammage: 90,
      coverGrammage: 250,
      coverPricePerKg: 1.5,
      numCahiers: 2,
      cahiersCount: 2,
      bindingTypeName: "Piqure",
      bindingOffsetTiers: [{ cahiersCount: 1, calageCost: 20, roulagePer1000: 15 }],
      ...overrides,
    });

  it("no supplements when standard paper and config", () => {
    const result = calcOffsetPrice(brochureInput());
    expect(result.bindingSurchargeDetail).toBeUndefined();
  });

  it("applies +20% for papier < 70g", () => {
    const result = calcOffsetPrice(brochureInput({ interiorGrammage: 60 }));
    expect(result.bindingSurchargeDetail).toContain("papier <70g +20%");
    // Binding cost should be ~1.2x base
    const base = calcOffsetPrice(brochureInput({ interiorGrammage: 90 }));
    expect(result.bindingCost).toBeGreaterThan(base.bindingCost);
  });

  it("applies +5% for couché satin > 115g", () => {
    const result = calcOffsetPrice(brochureInput({
      interiorPaperTypeName: "Couché Satin",
      interiorGrammage: 130,
    }));
    expect(result.bindingSurchargeDetail).toContain("couché satin >115g +5%");
  });

  it("applies +15% for couché mat > 115g", () => {
    const result = calcOffsetPrice(brochureInput({
      interiorPaperTypeName: "Couché Mat",
      interiorGrammage: 130,
    }));
    expect(result.bindingSurchargeDetail).toContain("couché mat >115g +15%");
  });

  it("applies +5% for 1 encart", () => {
    const result = calcOffsetPrice(brochureInput({ encartedCahiers: 1 }));
    expect(result.bindingSurchargeDetail).toContain("1 cahier encarté +5%");
  });

  it("applies +10% for 2 encarts", () => {
    const result = calcOffsetPrice(brochureInput({ encartedCahiers: 2 }));
    expect(result.bindingSurchargeDetail).toContain("2+ cahiers encartés +10%");
  });

  it("applies +20% for spine < 3mm", () => {
    const result = calcOffsetPrice(brochureInput({ spineThicknessCm: 0.2 }));
    expect(result.bindingSurchargeDetail).toContain("hors 3-35mm");
  });

  it("applies +20% for spine > 35mm", () => {
    const result = calcOffsetPrice(brochureInput({ spineThicknessCm: 4.0 }));
    expect(result.bindingSurchargeDetail).toContain("hors 3-35mm");
  });

  it("applies +20% for mixed cahiers", () => {
    const result = calcOffsetPrice(brochureInput({ hasMixedCahiers: true }));
    expect(result.bindingSurchargeDetail).toContain("cahiers mélangés +20%");
  });

  it("stacks multiple supplements", () => {
    const result = calcOffsetPrice(brochureInput({
      interiorGrammage: 60,
      encartedCahiers: 1,
    }));
    expect(result.bindingSurchargeDetail).toContain("papier <70g +20%");
    expect(result.bindingSurchargeDetail).toContain("1 cahier encarté +5%");
    // Total surcharge = 25%
    const base = calcOffsetPrice(brochureInput({ interiorGrammage: 90 }));
    const ratio = result.bindingCost / base.bindingCost;
    expect(ratio).toBeCloseTo(1.25, 1);
  });
});

// ── Rainage integration in offset price ─────────────────────────────────────
describe("calcOffsetPrice rainage integration", () => {
  it("includes rainage for brochures with cover", () => {
    const input = makeInput({
      productType: "BROCHURE",
      pagesInterior: 32,
      hasCover: true,
      numCahiers: 2,
      cahiersCount: 2,
      coverGrammage: 250,
      coverPricePerKg: 1.5,
      bindingTypeName: "Piqure",
      bindingOffsetTiers: [{ cahiersCount: 1, calageCost: 20, roulagePer1000: 15 }],
    });
    const result = calcOffsetPrice(input);
    expect(result.rainageCost).toBeGreaterThan(0);
    expect(result.subtotal).toBeGreaterThan(result.paperCostInterior + result.paperCostCover);
  });

  it("no rainage for flat products", () => {
    const result = calcOffsetPrice(makeInput());
    expect(result.rainageCost).toBe(0);
  });
});
