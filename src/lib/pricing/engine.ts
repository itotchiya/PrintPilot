import { prisma } from "@/lib/prisma";
import type { QuoteInput } from "./types";
import { calcWeightPerCopyGrams, estimateSpineThicknessCm } from "./weight";
import { calcPosesPerSheet, calcCahierStructure } from "./imposition";
import { calcDigitalPrice } from "./digital";
import type { DigitalInput, DigitalBreakdown } from "./digital";
import { calcOffsetPrice } from "./offset";
import type { OffsetInput, OffsetBreakdown } from "./offset";
import { calcDeliveryCost } from "./delivery";
import type { DeliveryRateData } from "./delivery";

/** Safely coerce Prisma Decimal or any value to number; avoids NaN (which JSON serializes to null). */
function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}

export interface PricingResult {
  digitalTotal: number;
  offsetTotal: number;
  digitalBreakdown: DigitalBreakdown;
  offsetBreakdown: OffsetBreakdown;
  deliveryCost: number;
  weightPerCopyGrams: number;
  currency: "EUR";
}

export async function calculatePricing(input: QuoteInput): Promise<PricingResult> {
  if (!input.productType || !input.quantity || !input.format) {
    throw new Error("Donnees de devis incompletes");
  }

  const [
    paperTypes,
    colorModes,
    bindingTypes,
    foldTypes,
    laminationFinishes,
    departments,
    carriers,
    digitalConfigRows,
    offsetConfigRows,
    marginConfigRows,
    machineFormats,
    clickDivisors,
  ] = await Promise.all([
    prisma.paperType.findMany({ include: { grammages: true } }),
    prisma.colorMode.findMany(),
    prisma.bindingType.findMany({ include: { digitalPriceTiers: true, offsetPriceTiers: true } }),
    prisma.foldType.findMany({ include: { costs: true } }),
    prisma.laminationFinish.findMany({ include: { digitalPriceTiers: true } }),
    prisma.department.findMany(),
    prisma.carrier.findMany({ where: { active: true }, include: { deliveryRates: true } }),
    prisma.digitalConfig.findMany(),
    prisma.offsetConfig.findMany(),
    prisma.marginConfig.findMany(),
    prisma.machineFormat.findMany({ where: { isDefault: true } }),
    prisma.formatClickDivisor.findMany(),
  ]);

  function cfgVal(rows: { key: string; value: unknown }[], key: string, fallback = 0): number {
    const row = rows.find(r => r.key === key);
    return row ? toNum(row.value) : fallback;
  }

  const digitalConfig = {
    colorClickRate: cfgVal(digitalConfigRows, "color_click_rate", 0.035),
    monoClickRate: cfgVal(digitalConfigRows, "mono_click_rate", 0.007),
    setupColor: cfgVal(digitalConfigRows, "setup_color", 80),
    setupMono: cfgVal(digitalConfigRows, "setup_mono", 15),
    fileProcessing: cfgVal(digitalConfigRows, "file_processing", 45),
    setupDivisor: cfgVal(digitalConfigRows, "setup_divisor", 3000),
  };

  const offsetConfig = {
    plateCost: cfgVal(offsetConfigRows, "plate_cost", 9.90),
    plateCostLarge: cfgVal(offsetConfigRows, "plate_cost_large", 17.40),
    calagePerPlate: cfgVal(offsetConfigRows, "calage_per_plate", 6),
    calageVernis: cfgVal(offsetConfigRows, "calage_vernis", 6),
    rechercheTeintePerPlate: cfgVal(offsetConfigRows, "recherche_teinte", 10),
    fileProcessingBase: cfgVal(offsetConfigRows, "file_processing_base", 12.50),
    fileProcessingPerPlate: cfgVal(offsetConfigRows, "file_processing_per_plate", 0.11),
    gacheCalage: cfgVal(offsetConfigRows, "gache_calage", 70),
    gacheTiragePct: cfgVal(offsetConfigRows, "gache_tirage_pct", 0.02),
    runningCostTier1: cfgVal(offsetConfigRows, "running_cost_tier_1", 25),
    runningCostTier2: cfgVal(offsetConfigRows, "running_cost_tier_2", 16),
    runningCostTier3: cfgVal(offsetConfigRows, "running_cost_tier_3", 15),
    runningCostTier4: cfgVal(offsetConfigRows, "running_cost_tier_4", 15),
    runningCostTier5: cfgVal(offsetConfigRows, "running_cost_tier_5", 15),
    paperMarginRate: cfgVal(marginConfigRows, "paper_margin", 0.15),
  };

  const digitalMarginRate = cfgVal(marginConfigRows, "digital_final_margin", 0.05);
  const offsetMarginRate = cfgVal(marginConfigRows, "offset_final_margin", 0.07);
  const hayonSurcharge = 25;

  const hasCover = input.productType === "BROCHURE";
  const pagesInterior = input.pagesInterior ?? 0;

  const interiorPaperType = paperTypes.find(p => p.id === input.paperInteriorTypeId);
  const interiorGrammage = interiorPaperType?.grammages.find(
    g => toNum(g.grammage) === toNum(input.paperInteriorGrammage)
  );

  const coverPaperType = hasCover ? paperTypes.find(p => p.id === input.paperCoverTypeId) : null;
  const coverGrammage = coverPaperType?.grammages.find(
    g => toNum(g.grammage) === toNum(input.paperCoverGrammage)
  ) ?? null;

  const colorModeInterior = colorModes.find(c => c.id === input.colorModeInteriorId);
  const colorModeCover = hasCover ? colorModes.find(c => c.id === input.colorModeCoverId) : null;

  const bindingType = hasCover ? bindingTypes.find(b => b.id === input.bindingTypeId) : null;

  const laminationFinish = input.laminationFinishId
    ? laminationFinishes.find(l => l.id === input.laminationFinishId)
    : null;

  const foldType = input.foldTypeId ? foldTypes.find(f => f.id === input.foldTypeId) : null;
  const foldCostRow = foldType?.costs.find(c => c.numFolds === input.foldCount);
  const foldCost = foldCostRow ? toNum(foldCostRow.cost) : 0;

  const machineFormat = machineFormats[0] ?? { widthCm: 65, heightCm: 92 };
  const machineWidthCm = toNum(machineFormat.widthCm) || 65;
  const machineHeightCm = toNum(machineFormat.heightCm) || 92;

  const productWidthCm = toNum(input.format?.widthCm) || 21;
  const productHeightCm = toNum(input.format?.heightCm) || 29.7;
  const posesPerSheet = calcPosesPerSheet({
    productWidthCm,
    productHeightCm,
    machineWidthCm,
    machineHeightCm,
    bleedCm: 0.3,
  });

  const cahierStruct = hasCover
    ? calcCahierStructure(pagesInterior, posesPerSheet)
    : { numCahiers: 1, pagesPerCahier: 2, totalSheets: 1, cahiersCount: 1 };

  const spineThickness = (hasCover && bindingType?.name?.includes("Dos carre"))
    ? estimateSpineThicknessCm(pagesInterior, input.paperInteriorGrammage ?? 90)
    : 0;

  const weightPerCopyGrams = calcWeightPerCopyGrams({
    widthCm: productWidthCm,
    heightCm: productHeightCm,
    grammageInterior: input.paperInteriorGrammage ?? 90,
    grammageCouvreture: hasCover ? (input.paperCoverGrammage ?? null) : null,
    pagesInterior: hasCover ? pagesInterior : 2,
    hasCover,
    spineThicknessCm: spineThickness,
  });

  const primaryCarrier = carriers[0];
  const deliveryRates: DeliveryRateData[] = (primaryCarrier?.deliveryRates ?? []).map(r => ({
    zone: r.zone,
    maxWeightKg: toNum(r.maxWeightKg),
    price: toNum(r.price),
  }));

  const deliveryPoints = input.deliveryPoints
    .filter(p => p.copies > 0 && p.departmentCode)
    .map(p => {
      const dept = departments.find(d => d.code === p.departmentCode);
      return { copies: p.copies, zone: dept?.zone ?? 3, hayon: p.hayon };
    });

  const deliveryResult = calcDeliveryCost(deliveryPoints, weightPerCopyGrams, {
    rates: deliveryRates,
    hayonSurcharge,
  });

  const digitalClickDivisors = clickDivisors.map(d => ({
    formatName: d.formatName,
    divisorRecto: toNum(d.divisorRecto),
    divisorRectoVerso: toNum(d.divisorRectoVerso),
  }));

  const digitalInput: DigitalInput = {
    productType: input.productType,
    quantity: input.quantity,
    widthCm: productWidthCm,
    heightCm: productHeightCm,
    pagesInterior,
    hasCover,
    rectoVerso: input.rectoVerso,
    interiorGrammageData: {
      grammage: input.paperInteriorGrammage ?? 90,
      pricePerKg: toNum(interiorGrammage?.pricePerKg ?? 1.0),
      weightPer1000Sheets: interiorGrammage?.weightPer1000Sheets ? toNum(interiorGrammage.weightPer1000Sheets) : null,
    },
    coverGrammageData: (hasCover && coverGrammage) ? {
      grammage: input.paperCoverGrammage ?? 250,
      pricePerKg: toNum(coverGrammage.pricePerKg),
      weightPer1000Sheets: coverGrammage.weightPer1000Sheets ? toNum(coverGrammage.weightPer1000Sheets) : null,
    } : null,
    colorModeName: colorModeInterior?.name ?? "Quadrichromie",
    colorModePlatesPerSide: colorModeInterior?.platesPerSide ?? 4,
    bindingTypeName: bindingType?.name ?? null,
    bindingDigitalTiers: (bindingType?.digitalPriceTiers ?? []).map(t => ({
      pageRangeMin: t.pageRangeMin,
      pageRangeMax: t.pageRangeMax,
      qtyMin: t.qtyMin,
      qtyMax: t.qtyMax,
      perUnitCost: toNum(t.perUnitCost),
      setupCost: toNum(t.setupCost),
    })),
    laminationMode: input.laminationMode,
    laminationTiers: (laminationFinish?.digitalPriceTiers ?? []).map(t => ({
      qtyMin: t.qtyMin,
      qtyMax: t.qtyMax,
      pricePerSheet: toNum(t.pricePerSheet),
      setupCost: toNum(t.setupCost),
    })),
    config: digitalConfig,
    clickDivisors: digitalClickDivisors,
  };

  const digitalBreakdown = calcDigitalPrice(digitalInput);
  const digitalTotal = (digitalBreakdown.subtotal + deliveryResult.total) * (1 + digitalMarginRate);

  const openWidthCm = toNum(input.openFormat?.widthCm) || productWidthCm;
  const openHeightCm = toNum(input.openFormat?.heightCm) || productHeightCm;
  const offsetInput: OffsetInput = {
    productType: input.productType,
    quantity: input.quantity,
    widthCm: productWidthCm,
    heightCm: productHeightCm,
    openWidthCm,
    openHeightCm,
    pagesInterior,
    hasCover,
    rectoVerso: input.rectoVerso,
    interiorPricePerKg: toNum(interiorGrammage?.pricePerKg ?? 1.0),
    interiorGrammage: input.paperInteriorGrammage ?? 90,
    coverPricePerKg: hasCover ? toNum(coverGrammage?.pricePerKg ?? 1.0) : null,
    coverGrammage: hasCover ? (input.paperCoverGrammage ?? null) : null,
    machineWidthCm,
    machineHeightCm,
    posesPerSheet,
    interiorPlatesPerSide: toNum(colorModeInterior?.platesPerSide ?? 4),
    coverPlatesPerSide: toNum(colorModeCover?.platesPerSide ?? 4),
    bindingTypeName: bindingType?.name ?? null,
    bindingOffsetTiers: (bindingType?.offsetPriceTiers ?? []).map(t => ({
      cahiersCount: t.cahiersCount,
      calageCost: toNum(t.calageCost),
      roulagePer1000: toNum(t.roulagePer1000),
    })),
    numCahiers: cahierStruct.numCahiers,
    cahiersCount: cahierStruct.cahiersCount,
    laminationMode: input.laminationMode,
    laminationConfig: laminationFinish ? {
      offsetPricePerM2: toNum(laminationFinish.offsetPricePerM2),
      offsetCalageForfait: toNum(laminationFinish.offsetCalageForfait),
      offsetMinimumBilling: toNum(laminationFinish.offsetMinimumBilling),
    } : null,
    foldCount: input.foldCount,
    foldCost,
    config: offsetConfig,
  };

  const offsetBreakdown = calcOffsetPrice(offsetInput);
  const offsetSubtotal = Number(offsetBreakdown.subtotal);
  const offsetTotalRaw = (Number.isFinite(offsetSubtotal) ? offsetSubtotal : 0) + deliveryResult.total;
  const offsetTotal = offsetTotalRaw * (1 + offsetMarginRate);

  const safeOffsetTotal = Number.isFinite(offsetTotal) ? Math.round(offsetTotal * 100) / 100 : 0;
  const safeOffsetBreakdown = {
    ...offsetBreakdown,
    paperCostInterior: toNum(offsetBreakdown.paperCostInterior),
    paperCostCover: toNum(offsetBreakdown.paperCostCover),
    plateCost: toNum(offsetBreakdown.plateCost),
    calageCost: toNum(offsetBreakdown.calageCost),
    runningCost: toNum(offsetBreakdown.runningCost),
    fileProcessing: toNum(offsetBreakdown.fileProcessing),
    bindingCost: toNum(offsetBreakdown.bindingCost),
    laminationCost: toNum(offsetBreakdown.laminationCost),
    foldCost: toNum(offsetBreakdown.foldCost),
    packagingCost: toNum(offsetBreakdown.packagingCost),
    subtotal: toNum(offsetBreakdown.subtotal),
    deliveryCost: deliveryResult.total,
    margin: toNum(offsetBreakdown.margin),
    total: safeOffsetTotal,
  };

  return {
    digitalTotal: Math.round(digitalTotal * 100) / 100,
    offsetTotal: safeOffsetTotal,
    digitalBreakdown: { ...digitalBreakdown, deliveryCost: deliveryResult.total, total: digitalTotal },
    offsetBreakdown: safeOffsetBreakdown,
    deliveryCost: deliveryResult.total,
    weightPerCopyGrams,
    currency: "EUR",
  };
}