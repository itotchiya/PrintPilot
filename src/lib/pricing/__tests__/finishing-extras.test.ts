import { describe, it, expect } from "vitest";
import { calcFinishingExtras, calcUVVarnishCost, calcEncartCost, calcRecassageCost, calcRabatCost } from "../finishing-extras";

describe("calcUVVarnishCost", () => {
  it("returns 0 when mode is null", () => {
    expect(calcUVVarnishCost({ mode: null, machineWidthCm: 65, machineHeightCm: 92, quantity: 1000 })).toBe(0);
  });

  it("uses large format rate for 65×92", () => {
    const cost = calcUVVarnishCost({ mode: "UV Brillant", machineWidthCm: 65, machineHeightCm: 92, quantity: 1000 });
    // Large format: calage 350 (>50×70) + 1000/1000 * 130 = 480
    expect(cost).toBe(350 + 130);
  });

  it("uses small format rate for 35×50", () => {
    const cost = calcUVVarnishCost({ mode: "UV Reserve", machineWidthCm: 35, machineHeightCm: 50, quantity: 2000 });
    // Small format: calage 260 (35×50) + 2000/1000 * 170 = 600
    expect(cost).toBe(260 + 2 * 170);
  });
});

describe("calcEncartCost", () => {
  it("returns 0 when mode is null", () => {
    expect(calcEncartCost(null, 1000)).toBe(0);
  });

  it("aléatoire: 37/1000", () => {
    expect(calcEncartCost("Aléatoire", 2000)).toBe(2 * 37);
  });

  it("non aléatoire: 50/1000", () => {
    expect(calcEncartCost("Non aléatoire", 3000)).toBe(3 * 50);
  });
});

describe("calcRecassageCost", () => {
  it("returns 0 when disabled", () => {
    expect(calcRecassageCost(false, 1000)).toBe(0);
  });

  it("calage 26 + 13/1000", () => {
    expect(calcRecassageCost(true, 2000)).toBe(26 + 2 * 13);
  });
});

describe("calcRabatCost", () => {
  it("returns 0 for 0 flaps", () => {
    expect(calcRabatCost(0, 1000)).toBe(0);
  });

  it("1 flap: 50/1000", () => {
    expect(calcRabatCost(1, 1000)).toBe(50);
  });

  it("2 flaps: 70/1000", () => {
    expect(calcRabatCost(2, 2000)).toBe(2 * 70);
  });
});

describe("calcFinishingExtras combined", () => {
  it("sums all extras", () => {
    const result = calcFinishingExtras({
      uvVarnish: { mode: "UV Brillant", machineWidthCm: 65, machineHeightCm: 92, quantity: 1000 },
      encartMode: "Aléatoire",
      recassageEnabled: true,
      numFlaps: 1,
      quantity: 1000,
    });
    expect(result.uvVarnishCost).toBeGreaterThan(0);
    expect(result.encartCost).toBe(37);
    expect(result.recassageCost).toBe(26 + 13);
    expect(result.rabatCost).toBe(50);
    expect(result.total).toBe(result.uvVarnishCost + result.encartCost + result.recassageCost + result.rabatCost);
  });

  it("returns all zeroes when nothing enabled", () => {
    const result = calcFinishingExtras({ quantity: 1000 });
    expect(result.total).toBe(0);
  });
});
