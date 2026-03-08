/**
 * Single-Method Pricing Engine
 * 
 * Provides separate calculation functions for Digital-only and Offset-only quotes.
 * These functions skip the dual-calculation logic and focus on a single method.
 */

import { prisma } from "@/lib/prisma";
import type { QuoteInput } from "./types";
import { calcWeightPerCopyGrams, estimateSpineThicknessCm } from "./weight";
import { calcPosesPerSheet, calcCahierStructure, pickOptimalMachineFormat } from "./imposition";
import { calcDigitalPrice, getDigitalClicks, getClickDivisorForFormat } from "./digital";
import type { DigitalInput, DigitalBreakdown } from "./digital";
import { calcOffsetPrice } from "./offset";
import type { OffsetInput, OffsetBreakdown, OffsetBindingRules } from "./offset";
import { calcDeliveryCost } from "./delivery";
import type { DeliveryRateData, DepartmentRateData, DeliveryPointResult, DeliveryPoint } from "./delivery";
import { calcPackagingCost } from "./packaging";
import { validateMethodAvailability } from "./method-availability";
import { calcFinishingExtras } from "./finishing-extras";

function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}

export interface CalculationVariable {
  name: string;
  value: string | number;
  formula?: string;
}

export interface SingleMethodResult {
  total: number;
  breakdown: DigitalBreakdown | OffsetBreakdown;
  deliveryCost: number;
  weightPerCopyGrams: number;
  currency: "EUR";
  calculationVariablesInputs: CalculationVariable[];
  calculationVariablesMethod: CalculationVariable[];
  error?: string | null;
  suggestion?: string | null;
  bestCarrierName?: string;
  finishingExtras?: { uvVarnishCost: number; encartCost: number; recassageCost: number; rabatCost: number; total: number };
  method: "digital" | "offset";
}

const DEFAULT_WIDTH_CM = 21;
const DEFAULT_HEIGHT_CM = 29.7;

function normalizeFormat(format: QuoteInput["format"]): { name: string; widthCm: number; heightCm: number } {
  if (format && typeof format === "object" && "widthCm" in format && "heightCm" in format) {
    const w = toNum((format as { widthCm?: unknown }).widthCm) || DEFAULT_WIDTH_CM;
    const h = toNum((format as { heightCm?: unknown }).heightCm) || DEFAULT_HEIGHT_CM;
    return {
      name: (format as { name?: string }).name ?? "Format",
      widthCm: w,
      heightCm: h,
    };
  }
  throw new Error("Format invalide : largeur et hauteur en cm requises");
}

/**
 * Calculate DIGITAL-only pricing
 * Skips offset calculation entirely
 */
export async function calculateDigitalOnly(
  input: QuoteInput,
  supplierId?: string | null
): Promise<SingleMethodResult> {
  if (!input.productType || !input.quantity) {
    throw new Error("Donnees de devis incompletes : type de produit et quantite requis");
  }

  const format = normalizeFormat(input.format);
  const scope = supplierId ?? null;
  const scopeWhere = { supplierId: scope };

  // Load configuration (same as main engine)
  const [
    paperTypes,
    colorModes,
    bindingTypes,
    foldTypes,
    laminationFinishes,
    departments,
    carriers,
    digitalConfigRows,
    marginConfigRows,
    clickDivisors,
  ] = await Promise.all([
    prisma.paperType.findMany({ where: scopeWhere, include: { grammages: true } }),
    prisma.colorMode.findMany({ where: scopeWhere }),
    prisma.bindingType.findMany({
      where: scopeWhere,
      include: { digitalPriceTiers: true, offsetPriceTiers: true },
    }),
    prisma.foldType.findMany({ where: scopeWhere, include: { costs: true } }),
    prisma.laminationFinish.findMany({ where: scopeWhere, include: { digitalPriceTiers: true } }),
    prisma.department.findMany(),
    prisma.carrier.findMany({ where: { ...scopeWhere, active: true }, include: { deliveryRates: true } }),
    prisma.digitalConfig.findMany({ where: scopeWhere }),
    prisma.marginConfig.findMany({ where: scopeWhere }),
    prisma.formatClickDivisor.findMany({ where: scopeWhere }),
  ]);

  function cfgVal(rows: { key: string; value: unknown }[], key: string, fallback = 0): number {
    const row = rows.find((r) => r.key === key);
    return row ? toNum(row.value) : fallback;
  }

  const digitalConfig = {
    colorClickRate: cfgVal(digitalConfigRows, "color_click_rate", 0.03),
    monoClickRate: cfgVal(digitalConfigRows, "mono_click_rate", 0.0065),
    setupColor: cfgVal(digitalConfigRows, "setup_color", 0),
    setupMono: cfgVal(digitalConfigRows, "setup_mono", 0),
    fileProcessing: cfgVal(digitalConfigRows, "file_processing", 45),
    fileProcessingFlat: cfgVal(digitalConfigRows, "file_processing_flat", 10),
    setupDivisor: cfgVal(digitalConfigRows, "setup_divisor", 3000),
    digitalMarkupMultiplier: cfgVal(digitalConfigRows, "digital_markup_multiplier", 1.5),
    minimumBillingFlat: cfgVal(digitalConfigRows, "minimum_billing_flat", 25),
    cuttingCostPerPose: cfgVal(digitalConfigRows, "cutting_cost_per_pose", 0.85),
    cuttingCostPerModel: cfgVal(digitalConfigRows, "cutting_cost_per_model", 1.25),
  };

  const rawDigitalMarginRate = cfgVal(marginConfigRows, "digital_markup", 0.05);
  const digitalMarginRate = rawDigitalMarginRate >= 1 ? rawDigitalMarginRate - 1 : rawDigitalMarginRate;
  const brochureDigitalMarginRate = cfgVal(digitalConfigRows, "brochure_digital_margin", 0.1);

  const hasCover = input.productType === "BROCHURE" && (input.pagesCover ?? 4) > 0;
  const pagesInterior = input.pagesInterior ?? 0;

  const interiorPaperType = paperTypes.find((p) => p.id === input.paperInteriorTypeId);
  const interiorGrammage = interiorPaperType?.grammages.find(
    (g) => toNum(g.grammage) === toNum(input.paperInteriorGrammage)
  );

  const coverPaperType = hasCover ? paperTypes.find((p) => p.id === input.paperCoverTypeId) : null;
  const coverGrammage =
    coverPaperType?.grammages.find((g) => toNum(g.grammage) === toNum(input.paperCoverGrammage)) ?? null;

  const colorModeInterior = colorModes.find((c) => c.id === input.colorModeInteriorId);
  const colorModeCover = hasCover ? colorModes.find((c) => c.id === input.colorModeCoverId) : null;
  const bindingType = hasCover ? bindingTypes.find((b) => b.id === input.bindingTypeId) : null;
  const laminationFinish = input.laminationFinishId
    ? laminationFinishes.find((l) => l.id === input.laminationFinishId)
    : null;

  // Validate digital availability
  const methodAvailability = validateMethodAvailability(
    input,
    bindingType ?? null,
    laminationFinish ?? null,
    bindingTypes
  );

  if (!methodAvailability.digitalAvailable) {
    return {
      total: 0,
      breakdown: {
        clickCostInterior: 0,
        clickCostCover: 0,
        paperCostInterior: 0,
        paperCostCover: 0,
        setupCost: 0,
        fileProcessing: 0,
        bindingCost: 0,
        laminationCost: 0,
        cuttingCost: 0,
        foldCost: 0,
        packagingCost: 0,
        paperAndClicksMarkedUp: 0,
        subtotal: 0,
        deliveryCost: 0,
        margin: 0,
        total: 0,
      } as DigitalBreakdown,
      deliveryCost: 0,
      weightPerCopyGrams: 0,
      currency: "EUR",
      calculationVariablesInputs: [],
      calculationVariablesMethod: [],
      error: methodAvailability.digitalReason ?? "Methode numerique non disponible",
      suggestion: methodAvailability.suggestions.forDigital,
      method: "digital",
    };
  }

  const foldType = input.foldTypeId ? foldTypes.find((f) => f.id === input.foldTypeId) : null;
  const foldCostRow = foldType?.costs.find((c) => c.numFolds === input.foldCount);
  const FOLD_CALAGE = 20;
  const foldCost = foldCostRow ? FOLD_CALAGE + (input.quantity / 1000) * toNum(foldCostRow.cost) : 0;

  const productWidthCm = format.widthCm;
  const productHeightCm = format.heightCm;

  const machineFormatOptions = [{ widthCm: 65, heightCm: 92, name: "65x92" }];
  const optimal = pickOptimalMachineFormat(productWidthCm, productHeightCm, machineFormatOptions, 0.3);
  // Convert clickDivisors to the expected format (Prisma returns Decimals, we need numbers)
  const clickDivisorsNumeric = clickDivisors.map(d => ({
    formatName: d.formatName,
    divisorRecto: toNum(d.divisorRecto),
    divisorRectoVerso: toNum(d.divisorRectoVerso),
  }));
  const divIterior = getClickDivisorForFormat(clickDivisorsNumeric, productWidthCm, productHeightCm);

  const spineThickness =
    hasCover && bindingType?.name?.toLowerCase().includes("dos carre")
      ? estimateSpineThicknessCm(pagesInterior, input.paperInteriorGrammage ?? 90, input.paperInteriorTypeName)
      : 0;

  const weightPerCopyGrams = calcWeightPerCopyGrams({
    widthCm: productWidthCm,
    heightCm: productHeightCm,
    grammageInterior: input.paperInteriorGrammage ?? 90,
    grammageCouvreture: hasCover ? input.paperCoverGrammage ?? null : null,
    pagesInterior: hasCover ? pagesInterior : 2,
    hasCover,
    spineThicknessCm: spineThickness,
    weightPer1000SheetsInterior: interiorGrammage?.weightPer1000Sheets
      ? toNum(interiorGrammage.weightPer1000Sheets)
      : null,
    weightPer1000SheetsCover:
      hasCover && coverGrammage?.weightPer1000Sheets ? toNum(coverGrammage.weightPer1000Sheets) : null,
  });

  const weightTotalKg = (weightPerCopyGrams * input.quantity) / 1000;
  const packagingCost = calcPackagingCost(input.packaging, input.quantity, weightTotalKg);

  // Delivery calculation (same as main engine)
  const deliveryPoints = input.deliveryPoints
    .filter((p) => p.copies > 0 && p.departmentCode)
    .map((p) => {
      const dept = departments.find((d) => d.code === p.departmentCode);
      return { copies: p.copies, zone: dept?.zone ?? 3, hayon: p.hayon, departmentCode: p.departmentCode };
    });

  let bestDeliveryResult = { points: [] as DeliveryPointResult[], total: 0 };
  let bestCarrierName = "(aucun)";
  const hayonSurcharge = 25;

  if (deliveryPoints.length > 0) {
    for (const carrier of carriers) {
      const rates: DeliveryRateData[] = (carrier.deliveryRates ?? []).map((r) => ({
        zone: r.zone,
        maxWeightKg: toNum(r.maxWeightKg),
        price: toNum(r.price),
      }));

      const result = calcDeliveryCost(deliveryPoints, weightPerCopyGrams, { rates, hayonSurcharge });

      if (bestDeliveryResult.total === 0 || result.total < bestDeliveryResult.total) {
        bestDeliveryResult = result;
        bestCarrierName = carrier.name;
      }
    }
  }

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
      weightPer1000Sheets: interiorGrammage?.weightPer1000Sheets
        ? toNum(interiorGrammage.weightPer1000Sheets)
        : null,
    },
    coverGrammageData:
      hasCover && coverGrammage
        ? {
            grammage: input.paperCoverGrammage ?? 250,
            pricePerKg: toNum(coverGrammage.pricePerKg),
            weightPer1000Sheets: coverGrammage.weightPer1000Sheets
              ? toNum(coverGrammage.weightPer1000Sheets)
              : null,
          }
        : null,
    colorModeName: colorModeInterior?.name ?? "Quadrichromie",
    colorModePlatesPerSide: colorModeInterior?.platesPerSide ?? 4,
    bindingTypeName: bindingType?.name ?? null,
    bindingDigitalTiers: (bindingType?.digitalPriceTiers ?? []).map((t) => ({
      pageRangeMin: t.pageRangeMin,
      pageRangeMax: t.pageRangeMax,
      qtyMin: t.qtyMin,
      qtyMax: t.qtyMax,
      perUnitCost: toNum(t.perUnitCost),
      setupCost: toNum(t.setupCost),
    })),
    bindingRules: bindingType?.rules || undefined,
    laminationMode: input.laminationMode,
    laminationTiers: (laminationFinish?.digitalPriceTiers ?? []).map((t) => ({
      qtyMin: t.qtyMin,
      qtyMax: t.qtyMax,
      pricePerSheet: toNum(t.pricePerSheet),
      setupCost: toNum(t.setupCost),
    })),
    config: digitalConfig,
    clickDivisors: clickDivisorsNumeric,
    foldCount: input.foldCount,
    packagingCost,
    numModels: (input as unknown as { numberOfModels?: number }).numberOfModels ?? 1,
    numPoses: Math.max(1, divIterior.recto || 1),
  };

  const digitalBreakdown = calcDigitalPrice(digitalInput);

  // Apply margin (same logic as main engine)
  const useDigitalMarkupModel = (digitalConfig.digitalMarkupMultiplier ?? 0) > 0;
  const isBrochureDigitalNoMarkup = input.productType === "BROCHURE" && hasCover;

  const digitalTotal = isBrochureDigitalNoMarkup
    ? (digitalBreakdown.subtotal + bestDeliveryResult.total) * (1 + brochureDigitalMarginRate)
    : useDigitalMarkupModel
      ? digitalBreakdown.subtotal + bestDeliveryResult.total
      : (digitalBreakdown.subtotal + bestDeliveryResult.total) * (1 + digitalMarginRate);

  // Build calculation variables
  const varsInputs: CalculationVariable[] = [];
  const varsNumerique: CalculationVariable[] = [];

  function addTo(arr: CalculationVariable[], name: string, value: string | number, formula?: string) {
    arr.push({ name, value, formula });
  }

  addTo(varsInputs, "Type de produit", input.productType ?? "");
  addTo(varsInputs, "Quantite", input.quantity);
  addTo(varsInputs, "Format (cm)", `${format.widthCm} x ${format.heightCm}`);
  addTo(varsInputs, "Methode", "Numerique uniquement");

  addTo(varsNumerique, "Tarif clic couleur", digitalConfig.colorClickRate);
  addTo(varsNumerique, "Tarif clic N&B", digitalConfig.monoClickRate);
  addTo(varsNumerique, "Clics interieur", Math.round(digitalInput.pagesInterior * input.quantity / (divIterior.rv * 2)));
  addTo(varsNumerique, "Cout clics", digitalBreakdown.clickCostInterior);
  addTo(varsNumerique, "Papier interieur", digitalBreakdown.paperCostInterior);
  addTo(varsNumerique, "Fichier", digitalBreakdown.fileProcessing);
  addTo(varsNumerique, "Reliure", digitalBreakdown.bindingCost);
  addTo(varsNumerique, "Pelliculage", digitalBreakdown.laminationCost);
  addTo(varsNumerique, "Sous-total", digitalBreakdown.subtotal);
  addTo(varsNumerique, "Livraison", bestDeliveryResult.total);
  addTo(varsNumerique, "Total HT", digitalTotal);

  // Finishing extras
  const finishingExtras = calcFinishingExtras({
    uvVarnish:
      input.uvVarnishMode && input.uvVarnishMode !== "Rien"
        ? { mode: input.uvVarnishMode as "UV Brillant" | "UV Reserve", machineWidthCm: 65, machineHeightCm: 92, quantity: input.quantity }
        : undefined,
    encartMode: (input.encartMode && input.encartMode !== "Rien" ? input.encartMode : null) as "Aléatoire" | "Non aléatoire" | null,
    recassageEnabled: input.recassageEnabled ?? false,
    numFlaps: input.flapSizeCm > 0 ? (input.flapSizeCm > 5 ? 2 : 1) : 0,
    quantity: input.quantity,
  });

  return {
    total: Math.round(digitalTotal * 100) / 100,
    breakdown: { ...digitalBreakdown, deliveryCost: bestDeliveryResult.total, total: digitalTotal },
    deliveryCost: bestDeliveryResult.total,
    weightPerCopyGrams,
    currency: "EUR",
    calculationVariablesInputs: varsInputs,
    calculationVariablesMethod: varsNumerique,
    bestCarrierName,
    finishingExtras,
    method: "digital",
  };
}

/**
 * Calculate OFFSET-only pricing
 * Skips digital calculation entirely
 */
export async function calculateOffsetOnly(
  input: QuoteInput,
  supplierId?: string | null
): Promise<SingleMethodResult> {
  if (!input.productType || !input.quantity) {
    throw new Error("Donnees de devis incompletes : type de produit et quantite requis");
  }

  const format = normalizeFormat(input.format);
  const scope = supplierId ?? null;
  const scopeWhere = { supplierId: scope };

  // Load configuration
  const [
    paperTypes,
    colorModes,
    bindingTypes,
    foldTypes,
    laminationFinishes,
    departments,
    carriers,
    offsetConfigRows,
    marginConfigRows,
    machineFormats,
  ] = await Promise.all([
    prisma.paperType.findMany({ where: scopeWhere, include: { grammages: true } }),
    prisma.colorMode.findMany({ where: scopeWhere }),
    prisma.bindingType.findMany({
      where: scopeWhere,
      include: { digitalPriceTiers: true, offsetPriceTiers: true },
    }),
    prisma.foldType.findMany({ where: scopeWhere, include: { costs: true } }),
    prisma.laminationFinish.findMany({ where: scopeWhere }),
    prisma.department.findMany(),
    prisma.carrier.findMany({ where: { ...scopeWhere, active: true }, include: { deliveryRates: true } }),
    prisma.offsetConfig.findMany({ where: scopeWhere }),
    prisma.marginConfig.findMany({ where: scopeWhere }),
    prisma.machineFormat.findMany({ where: scopeWhere }),
  ]);

  function cfgVal(rows: { key: string; value: unknown }[], key: string, fallback = 0): number {
    const row = rows.find((r) => r.key === key);
    return row ? toNum(row.value) : fallback;
  }

  const offsetConfig = {
    plateCost: cfgVal(offsetConfigRows, "plate_cost", 11),
    plateCostLarge: cfgVal(offsetConfigRows, "plate_cost_large", 17.4),
    calagePerPlate: cfgVal(offsetConfigRows, "calage_per_plate", 6),
    calageVernis: cfgVal(offsetConfigRows, "calage_vernis", 6),
    rechercheTeintePerPlate: cfgVal(offsetConfigRows, "recherche_teinte", 10),
    fixedSetupFlat: cfgVal(offsetConfigRows, "fixed_setup_flat", 50),
    fileProcessingPerTreatment: cfgVal(offsetConfigRows, "file_processing_per_treatment", 12.5),
    fileProcessingBase: cfgVal(offsetConfigRows, "file_processing_base", 12.5),
    fileProcessingPerPlate: cfgVal(offsetConfigRows, "file_processing_per_plate", 0),
    gacheCalage: cfgVal(offsetConfigRows, "gache_calage", 70),
    gacheTiragePct: cfgVal(offsetConfigRows, "gache_tirage_pct", 0.005), // legacy fallback
    gacheTiragePctTier3k: cfgVal(offsetConfigRows, "gache_tirage_pct_3k", 0.002),
    gacheTiragePctTier5k: cfgVal(offsetConfigRows, "gache_tirage_pct_5k", 0.005),
    gacheTiragePctTier8k: cfgVal(offsetConfigRows, "gache_tirage_pct_8k", 0.006),
    gacheTiragePctTier10k: cfgVal(offsetConfigRows, "gache_tirage_pct_10k", 0.008),
    gacheVernis: cfgVal(offsetConfigRows, "gache_vernis", 2),
    runningCostTier1: cfgVal(offsetConfigRows, "running_cost_tier_1", 15),
    runningCostTier2: cfgVal(offsetConfigRows, "running_cost_tier_2", 15),
    runningCostTier3: cfgVal(offsetConfigRows, "running_cost_tier_3", 15),
    runningCostTier4: cfgVal(offsetConfigRows, "running_cost_tier_4", 15),
    runningCostTier5: cfgVal(offsetConfigRows, "running_cost_tier_5", 15),
    runningCostTier6: cfgVal(offsetConfigRows, "running_cost_tier_6", 15),
    runningCostVernis: cfgVal(offsetConfigRows, "running_cost_vernis", 20),
    paperMarginRate: cfgVal(marginConfigRows, "paper_margin", 0.1),
    discountPlates: cfgVal(offsetConfigRows, "discount_plates", 0),
    discountCalage: cfgVal(offsetConfigRows, "discount_calage", 0.1),
    discountRoulage: cfgVal(offsetConfigRows, "discount_roulage", 0.1),
    discountFichiers: cfgVal(offsetConfigRows, "discount_fichiers", 0.5),
    discountFaconnage: cfgVal(offsetConfigRows, "discount_faconnage", 0.1),
    discountPelliculage: cfgVal(offsetConfigRows, "discount_pelliculage", 0),
  };

  const offsetMarginRate = cfgVal(marginConfigRows, "offset_markup", 0.07);
  const rawOffsetMarginRate = offsetMarginRate >= 1 ? offsetMarginRate - 1 : offsetMarginRate;

  const hasCover = input.productType === "BROCHURE" && (input.pagesCover ?? 4) > 0;
  const pagesInterior = input.pagesInterior ?? 0;

  const interiorPaperType = paperTypes.find((p) => p.id === input.paperInteriorTypeId);
  const interiorGrammage = interiorPaperType?.grammages.find(
    (g) => toNum(g.grammage) === toNum(input.paperInteriorGrammage)
  );

  const coverPaperType = hasCover ? paperTypes.find((p) => p.id === input.paperCoverTypeId) : null;
  const coverGrammage =
    coverPaperType?.grammages.find((g) => toNum(g.grammage) === toNum(input.paperCoverGrammage)) ?? null;

  const colorModeInterior = colorModes.find((c) => c.id === input.colorModeInteriorId);
  const colorModeCover = hasCover ? colorModes.find((c) => c.id === input.colorModeCoverId) : null;
  const bindingType = hasCover ? bindingTypes.find((b) => b.id === input.bindingTypeId) : null;
  const laminationFinish = input.laminationFinishId
    ? laminationFinishes.find((l) => l.id === input.laminationFinishId)
    : null;

  // Validate offset availability
  const methodAvailability = validateMethodAvailability(
    input,
    bindingType ?? null,
    laminationFinish ?? null,
    bindingTypes
  );

  if (!methodAvailability.offsetAvailable) {
    return {
      total: 0,
      breakdown: {
        paperCostInterior: 0,
        paperCostCover: 0,
        plateCost: 0,
        calageCost: 0,
        runningCost: 0,
        fileProcessing: 0,
        bindingCost: 0,
        rainageCost: 0,
        laminationCost: 0,
        foldCost: 0,
        cuttingCost: 0,
        packagingCost: 0,
        setupCostFlat: 0,
        subtotal: 0,
        deliveryCost: 0,
        margin: 0,
        tauxDeMarque: 0,
        total: 0,
      } as OffsetBreakdown,
      deliveryCost: 0,
      weightPerCopyGrams: 0,
      currency: "EUR",
      calculationVariablesInputs: [],
      calculationVariablesMethod: [],
      error: methodAvailability.offsetReason ?? "Methode offset non disponible",
      suggestion: methodAvailability.suggestions.forOffset,
      method: "offset",
    };
  }

  const foldType = input.foldTypeId ? foldTypes.find((f) => f.id === input.foldTypeId) : null;
  const foldCostRow = foldType?.costs.find((c) => c.numFolds === input.foldCount);
  const FOLD_CALAGE = 20;
  const foldCost = foldCostRow ? FOLD_CALAGE + (input.quantity / 1000) * toNum(foldCostRow.cost) : 0;

  const productWidthCm = format.widthCm;
  const productHeightCm = format.heightCm;
  const openWidthCm = toNum(input.openFormat?.widthCm) || productWidthCm;
  const openHeightCm = toNum(input.openFormat?.heightCm) || productHeightCm;

  const machineFormatOptions = machineFormats.map((m) => ({
    widthCm: toNum(m.widthCm) || 65,
    heightCm: toNum(m.heightCm) || 92,
    name: m.name ?? undefined,
  }));

  const optimal = pickOptimalMachineFormat(productWidthCm, productHeightCm, machineFormatOptions, 0.3);
  const machineWidthCm = optimal.widthCm;
  const machineHeightCm = optimal.heightCm;
  const posesPerSheet = optimal.posesPerSheet;

  const interiorPlatesPerSide = toNum(colorModeInterior?.platesPerSide ?? 4);
  const coverPlatesPerSideVal = toNum(colorModeCover?.platesPerSide ?? 4);

  const cahierStruct = hasCover
    ? calcCahierStructure(pagesInterior, posesPerSheet, interiorPlatesPerSide)
    : { numCahiers: 1, pagesPerCahier: 2, totalSheets: 1, cahiersCount: 1, totalPlatesInterior: interiorPlatesPerSide * 2 };

  const spineThickness =
    hasCover && bindingType?.name?.toLowerCase().includes("dos carre")
      ? estimateSpineThicknessCm(pagesInterior, input.paperInteriorGrammage ?? 90, input.paperInteriorTypeName)
      : 0;

  const weightPerCopyGrams = calcWeightPerCopyGrams({
    widthCm: productWidthCm,
    heightCm: productHeightCm,
    grammageInterior: input.paperInteriorGrammage ?? 90,
    grammageCouvreture: hasCover ? input.paperCoverGrammage ?? null : null,
    pagesInterior: hasCover ? pagesInterior : 2,
    hasCover,
    spineThicknessCm: spineThickness,
    weightPer1000SheetsInterior: interiorGrammage?.weightPer1000Sheets
      ? toNum(interiorGrammage.weightPer1000Sheets)
      : null,
    weightPer1000SheetsCover:
      hasCover && coverGrammage?.weightPer1000Sheets ? toNum(coverGrammage.weightPer1000Sheets) : null,
  });

  const weightTotalKg = (weightPerCopyGrams * input.quantity) / 1000;
  const packagingCost = calcPackagingCost(input.packaging, input.quantity, weightTotalKg);

  // Delivery calculation
  const deliveryPoints = input.deliveryPoints
    .filter((p) => p.copies > 0 && p.departmentCode)
    .map((p) => {
      const dept = departments.find((d) => d.code === p.departmentCode);
      return { copies: p.copies, zone: dept?.zone ?? 3, hayon: p.hayon, departmentCode: p.departmentCode };
    });

  let bestDeliveryResult = { points: [] as DeliveryPointResult[], total: 0 };
  let bestCarrierName = "(aucun)";
  const hayonSurcharge = 25;

  if (deliveryPoints.length > 0) {
    for (const carrier of carriers) {
      const rates: DeliveryRateData[] = (carrier.deliveryRates ?? []).map((r) => ({
        zone: r.zone,
        maxWeightKg: toNum(r.maxWeightKg),
        price: toNum(r.price),
      }));

      const result = calcDeliveryCost(deliveryPoints, weightPerCopyGrams, { rates, hayonSurcharge });

      if (bestDeliveryResult.total === 0 || result.total < bestDeliveryResult.total) {
        bestDeliveryResult = result;
        bestCarrierName = carrier.name;
      }
    }
  }

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
    interiorPaperTypeName: input.paperInteriorTypeName ?? null,
    coverPaperTypeName: hasCover ? (input.paperCoverTypeName ?? null) : null,
    machineWidthCm,
    machineHeightCm,
    posesPerSheet,
    interiorPlatesPerSide,
    coverPlatesPerSide: coverPlatesPerSideVal,
    totalPlatesInterior: cahierStruct.totalPlatesInterior,
    bindingTypeName: bindingType?.name ?? null,
    bindingOffsetTiers: (bindingType?.offsetPriceTiers ?? []).map((t) => ({
      cahiersCount: t.cahiersCount,
      calageCost: toNum(t.calageCost),
      roulagePer1000: toNum(t.roulagePer1000),
    })),
    bindingRules: (bindingType?.rules as unknown as OffsetBindingRules) || undefined,
    numCahiers: cahierStruct.numCahiers,
    cahiersCount: cahierStruct.cahiersCount,
    laminationMode: input.laminationMode,
    laminationConfig: laminationFinish
      ? {
          offsetPricePerM2: toNum(laminationFinish.offsetPricePerM2),
          offsetCalageForfait: toNum(laminationFinish.offsetCalageForfait),
          offsetMinimumBilling: toNum(laminationFinish.offsetMinimumBilling),
        }
      : null,
    foldCount: input.foldCount,
    foldCost,
    packagingCost,
    hasColorModeVarnish:
      !!(colorModeInterior as { hasVarnish?: boolean } | null)?.hasVarnish ||
      !!(colorModeCover as { hasVarnish?: boolean } | null)?.hasVarnish,
    spineThicknessCm: spineThickness,
    encartedCahiers: input.encartedCahiers ?? 0,
    hasMixedCahiers: input.hasMixedCahiers ?? false,
    config: offsetConfig,
  };

  const offsetBreakdown = calcOffsetPrice(offsetInput);

  // Apply margin
  const offsetSubtotal = Number(offsetBreakdown.subtotal);
  const offsetTotalRaw = (Number.isFinite(offsetSubtotal) ? offsetSubtotal : 0) + bestDeliveryResult.total;
  const offsetTotal = offsetTotalRaw * (1 + rawOffsetMarginRate);

  // Build calculation variables
  const varsInputs: CalculationVariable[] = [];
  const varsOffset: CalculationVariable[] = [];

  function addTo(arr: CalculationVariable[], name: string, value: string | number, formula?: string) {
    arr.push({ name, value, formula });
  }

  addTo(varsInputs, "Type de produit", input.productType ?? "");
  addTo(varsInputs, "Quantite", input.quantity);
  addTo(varsInputs, "Format (cm)", `${format.widthCm} x ${format.heightCm}`);
  addTo(varsInputs, "Methode", "Offset uniquement");

  addTo(varsOffset, "Cout plaques", offsetBreakdown.plateCost);
  addTo(varsOffset, "Cout calage", offsetBreakdown.calageCost);
  addTo(varsOffset, "Cout roulage", offsetBreakdown.runningCost);
  addTo(varsOffset, "Cout papier", offsetBreakdown.paperCostInterior + offsetBreakdown.paperCostCover);
  addTo(varsOffset, "Fichiers", offsetBreakdown.fileProcessing);
  addTo(varsOffset, "Reliure", offsetBreakdown.bindingCost);
  addTo(varsOffset, "Rainage", offsetBreakdown.rainageCost);
  addTo(varsOffset, "Pelliculage", offsetBreakdown.laminationCost);
  addTo(varsOffset, "Sous-total", offsetBreakdown.subtotal);
  addTo(varsOffset, "Livraison", bestDeliveryResult.total);
  addTo(varsOffset, "Total HT", offsetTotal);

  // Finishing extras
  const finishingExtras = calcFinishingExtras({
    uvVarnish:
      input.uvVarnishMode && input.uvVarnishMode !== "Rien"
        ? { mode: input.uvVarnishMode as "UV Brillant" | "UV Reserve", machineWidthCm, machineHeightCm, quantity: input.quantity }
        : undefined,
    encartMode: (input.encartMode && input.encartMode !== "Rien" ? input.encartMode : null) as "Aléatoire" | "Non aléatoire" | null,
    recassageEnabled: input.recassageEnabled ?? false,
    numFlaps: input.flapSizeCm > 0 ? (input.flapSizeCm > 5 ? 2 : 1) : 0,
    quantity: input.quantity,
  });

  return {
    total: Math.round(offsetTotal * 100) / 100,
    breakdown: {
      ...offsetBreakdown,
      deliveryCost: bestDeliveryResult.total,
      total: offsetTotal,
    },
    deliveryCost: bestDeliveryResult.total,
    weightPerCopyGrams,
    currency: "EUR",
    calculationVariablesInputs: varsInputs,
    calculationVariablesMethod: varsOffset,
    bestCarrierName,
    finishingExtras,
    method: "offset",
  };
}
