import { describe, it, expect } from "vitest";
import { validateFoldGrammage, validateCrossFold } from "../product-rules";
import { validateMethodAvailability } from "../method-availability";
import type { QuoteInput } from "../types";
import { EMPTY_QUOTE_INPUT } from "../types";

// ── Fold grammage validation ────────────────────────────────────────────────
describe("validateFoldGrammage", () => {
  it("returns valid for no fold", () => {
    expect(validateFoldGrammage(null, 0, 200).valid).toBe(true);
  });

  it("1 pli accordéon is FORBIDDEN", () => {
    const result = validateFoldGrammage("Pli Accordéon", 1, 100);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain("interdit");
  });

  it("2 plis accordéon at 270g is valid", () => {
    expect(validateFoldGrammage("Pli Accordéon", 2, 270).valid).toBe(true);
  });

  it("2 plis accordéon at 280g exceeds max", () => {
    const result = validateFoldGrammage("Pli Accordéon", 2, 280);
    expect(result.valid).toBe(false);
    expect(result.maxGrammage).toBe(270);
  });

  it("3 plis croisé at 150g is valid", () => {
    expect(validateFoldGrammage("Pli Croisé", 3, 150).valid).toBe(true);
  });

  it("3 plis croisé at 160g exceeds max 150g", () => {
    const result = validateFoldGrammage("Pli Croisé", 3, 160);
    expect(result.valid).toBe(false);
    expect(result.maxGrammage).toBe(150);
  });

  it("6 plis roulé at 135g is valid", () => {
    expect(validateFoldGrammage("Pli Roulé", 6, 135).valid).toBe(true);
  });

  it("6 plis roulé at 140g exceeds max 135g", () => {
    const result = validateFoldGrammage("Pli Roulé", 6, 140);
    expect(result.valid).toBe(false);
    expect(result.maxGrammage).toBe(135);
  });

  it("5 plis économique is FORBIDDEN (null in table)", () => {
    const result = validateFoldGrammage("Pli Économique", 5, 100);
    expect(result.valid).toBe(false);
  });

  it("4 plis économique at 170g is valid", () => {
    expect(validateFoldGrammage("Pli Économique", 4, 170).valid).toBe(true);
  });
});

describe("validateCrossFold", () => {
  it("allows 1 pli at 270g", () => {
    expect(validateCrossFold(1, 270).valid).toBe(true);
  });

  it("rejects 3 plis", () => {
    expect(validateCrossFold(3, 100).valid).toBe(false);
  });

  it("rejects 2 plis at 260g", () => {
    expect(validateCrossFold(2, 260).valid).toBe(false);
    expect(validateCrossFold(2, 260).maxGrammage).toBe(250);
  });
});

// ── DCC Pre-checks ──────────────────────────────────────────────────────────
describe("validateMethodAvailability DCC pre-checks", () => {
  const makeInput = (overrides: Partial<QuoteInput> = {}): QuoteInput => ({
    ...EMPTY_QUOTE_INPUT,
    productType: "BROCHURE",
    ...overrides,
  });

  const makeDCCBinding = () => ({
    id: "dcc-1",
    name: "Dos carré collé",
    digitalPriceTiers: [{ id: "t1" }],
    offsetPriceTiers: [{ id: "t2" }],
  });

  it("blocks when DCC total pages < 40", () => {
    const result = validateMethodAvailability(
      makeInput({ pagesInterior: 32, pagesCover: 4 }),
      makeDCCBinding(),
      null,
      [makeDCCBinding()]
    );
    expect(result.digitalAvailable).toBe(false);
    expect(result.digitalReason).toContain("minimum 40 pages");
  });

  it("allows when DCC total pages ≥ 40", () => {
    const result = validateMethodAvailability(
      makeInput({ pagesInterior: 36, pagesCover: 4, paperCoverGrammage: 250 }),
      makeDCCBinding(),
      null,
      [makeDCCBinding()]
    );
    expect(result.digitalAvailable).toBe(true);
  });

  it("blocks when DCC cover grammage < 170g", () => {
    const result = validateMethodAvailability(
      makeInput({ pagesInterior: 40, pagesCover: 4, paperCoverGrammage: 150 }),
      makeDCCBinding(),
      null,
      [makeDCCBinding()]
    );
    expect(result.digitalAvailable).toBe(false);
    expect(result.digitalReason).toContain("170g");
  });

  it("blocks DCC with Pelliculage Recto Verso", () => {
    const result = validateMethodAvailability(
      makeInput({
        pagesInterior: 40,
        pagesCover: 4,
        paperCoverGrammage: 250,
        laminationMode: "Pelliculage Recto Verso",
      }),
      makeDCCBinding(),
      null,
      [makeDCCBinding()]
    );
    expect(result.digitalAvailable).toBe(false);
    expect(result.digitalReason).toContain("incompatible");
  });

  it("blocks pages not multiple of 4", () => {
    const result = validateMethodAvailability(
      makeInput({ pagesInterior: 30, pagesCover: 4 }),
      null,
      null,
      []
    );
    expect(result.digitalAvailable).toBe(false);
    expect(result.digitalReason).toContain("multiple de 4");
  });

  it("blocks pages < 4", () => {
    const result = validateMethodAvailability(
      makeInput({ pagesInterior: 2, pagesCover: 4 }),
      null,
      null,
      []
    );
    expect(result.digitalAvailable).toBe(false);
    expect(result.digitalReason).toContain("≥ 4");
  });
});
