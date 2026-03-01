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

/** Safely coerce Prisma Decimal or any value to number; avoids NaN (which JSON serializes to null). */
function toNum(v: unknown): number {
  if (typeof v === "number" && !Number.isNaN(v)) return v;
  const n = parseFloat(String(v ?? "0"));
  return Number.isNaN(n) ? 0 : n;
}

export interface CalculationVariable {
  name: string;
  value: string | number;
  /** Optional formula showing how the value was calculated (e.g. "Clics × Tarif = 7000 × 0.035") */
  formula?: string;
}

export interface PricingResult {
  digitalTotal: number;
  offsetTotal: number;
  digitalBreakdown: DigitalBreakdown;
  offsetBreakdown: OffsetBreakdown;
  deliveryCost: number;
  weightPerCopyGrams: number;
  currency: "EUR";
  /** Best price between digital and offset (XLSM: min of the two). */
  bestTotal: number;
  /** "digital" | "offset" — which method gives the best price. */
  bestMethod: "digital" | "offset";
  /** Ecart: digitalTotal - offsetTotal (positive = offset cheaper). */
  ecart: number;
  /** Calculation variables for admin/superadmin preview: inputs, numérique, offset. */
  calculationVariablesInputs: CalculationVariable[];
  calculationVariablesNumerique: CalculationVariable[];
  calculationVariablesOffset: CalculationVariable[];
  /** Error message when digital calculation failed (card shown disabled). */
  digitalError?: string | null;
  /** Error message when offset calculation failed (card shown disabled). */
  offsetError?: string | null;
  /** Suggestion to enable digital when unavailable. */
  digitalSuggestion?: string | null;
  /** Suggestion to enable offset when unavailable. */
  offsetSuggestion?: string | null;
  /** Name of the cheapest carrier selected for delivery. */
  bestCarrierName?: string;
  /** Finishing extras breakdown (UV varnish, encart, recassage, rabats). */
  finishingExtras?: { uvVarnishCost: number; encartCost: number; recassageCost: number; rabatCost: number; total: number };
}

const DEFAULT_WIDTH_CM = 21;
const DEFAULT_HEIGHT_CM = 29.7;

/** Normalize format so engine always receives { name, widthCm, heightCm }. */
function normalizeFormat(
  format: QuoteInput["format"]
): { name: string; widthCm: number; heightCm: number } {
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

export async function calculatePricing(
  input: QuoteInput,
  fournisseurId?: string | null
): Promise<PricingResult> {
  if (!input.productType || !input.quantity) {
    throw new Error("Donnees de devis incompletes : type de produit et quantite requis");
  }

  const format = normalizeFormat(input.format);

  const scope = fournisseurId ?? null;
  const scopeWhere = { fournisseurId: scope };

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
    prisma.paperType.findMany({ where: scopeWhere, include: { grammages: true } }),
    prisma.colorMode.findMany({ where: scopeWhere }),
    prisma.bindingType.findMany({
      where: scopeWhere,
      // Select the rules JSON too
      select: {
        id: true,
        name: true,
        rules: true,
        digitalPriceTiers: true,
        offsetPriceTiers: true
      }
    }),
    prisma.foldType.findMany({ where: scopeWhere, include: { costs: true } }),
    prisma.laminationFinish.findMany({
      where: scopeWhere,
      include: { digitalPriceTiers: true },
    }),
    prisma.department.findMany(),
    prisma.carrier.findMany({
      where: { ...scopeWhere, active: true },
      include: { deliveryRates: true },
    }),
    prisma.digitalConfig.findMany({ where: scopeWhere }),
    prisma.offsetConfig.findMany({ where: scopeWhere }),
    prisma.marginConfig.findMany({ where: scopeWhere }),
    prisma.machineFormat.findMany({
      where: scopeWhere,
      orderBy: { name: "asc" },
    }),
    prisma.formatClickDivisor.findMany({ where: scopeWhere }),
  ]);

  function cfgVal(rows: { key: string; value: unknown }[], key: string, fallback = 0): number {
    const row = rows.find(r => r.key === key);
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
    digitalMarkupMultiplier: cfgVal(digitalConfigRows, "digital_markup_multiplier", 1.50),
    minimumBillingFlat: cfgVal(digitalConfigRows, "minimum_billing_flat", 25),
    cuttingCostPerPose: cfgVal(digitalConfigRows, "cutting_cost_per_pose", 0.85),
    cuttingCostPerModel: cfgVal(digitalConfigRows, "cutting_cost_per_model", 1.25),
  };

  const offsetConfig = {
    plateCost: cfgVal(offsetConfigRows, "plate_cost", 11),
    plateCostLarge: cfgVal(offsetConfigRows, "plate_cost_large", 17.40),
    calagePerPlate: cfgVal(offsetConfigRows, "calage_per_plate", 6),
    calageVernis: cfgVal(offsetConfigRows, "calage_vernis", 6),
    rechercheTeintePerPlate: cfgVal(offsetConfigRows, "recherche_teinte", 10),
    fixedSetupFlat: cfgVal(offsetConfigRows, "fixed_setup_flat", 50),
    fileProcessingPerTreatment: cfgVal(offsetConfigRows, "file_processing_per_treatment", 12.50),
    fileProcessingBase: cfgVal(offsetConfigRows, "file_processing_base", 12.50),
    fileProcessingPerPlate: cfgVal(offsetConfigRows, "file_processing_per_plate", 0),
    gacheCalage: cfgVal(offsetConfigRows, "gache_calage", 70),
    gacheTiragePct: cfgVal(offsetConfigRows, "gache_tirage_pct", 0.02),
    gacheTiragePctTier3k: cfgVal(offsetConfigRows, "gache_tirage_pct_3k", 0.002),
    gacheTiragePctTier5k: cfgVal(offsetConfigRows, "gache_tirage_pct_5k", 0.005),
    gacheTiragePctTier8k: cfgVal(offsetConfigRows, "gache_tirage_pct_8k", 0.006),
    gacheTiragePctTier10k: cfgVal(offsetConfigRows, "gache_tirage_pct_10k", 0.008),
    gacheVernis: cfgVal(offsetConfigRows, "gache_vernis", 2),
    // ── Running cost tiers (XLSM-corrected: all tiers = 15 €/1000) ──
    runningCostTier1: cfgVal(offsetConfigRows, "running_cost_tier_1", 15),
    runningCostTier2: cfgVal(offsetConfigRows, "running_cost_tier_2", 15),
    runningCostTier3: cfgVal(offsetConfigRows, "running_cost_tier_3", 15),
    runningCostTier4: cfgVal(offsetConfigRows, "running_cost_tier_4", 15),
    runningCostTier5: cfgVal(offsetConfigRows, "running_cost_tier_5", 15),
    runningCostTier6: cfgVal(offsetConfigRows, "running_cost_tier_6", 15),
    runningCostVernis: cfgVal(offsetConfigRows, "running_cost_vernis", 20),
    // ── Paper margin (XLSM-corrected: 10%) ──
    paperMarginRate: cfgVal(marginConfigRows, "paper_margin", 0.10),
    // ── Per-component discount rates (XLSM Détails PRIX remise system) ──
    discountPlates: cfgVal(offsetConfigRows, "discount_plates", 0.00),
    discountCalage: cfgVal(offsetConfigRows, "discount_calage", 0.10),
    discountRoulage: cfgVal(offsetConfigRows, "discount_roulage", 0.10),
    discountFichiers: cfgVal(offsetConfigRows, "discount_fichiers", 0.50),
    discountFaconnage: cfgVal(offsetConfigRows, "discount_faconnage", 0.10),
    discountPelliculage: cfgVal(offsetConfigRows, "discount_pelliculage", 0.00),
  };

  const rawDigitalMarginRate = cfgVal(marginConfigRows, "digital_markup", 0.05);
  const digitalMarginRate = rawDigitalMarginRate >= 1 ? rawDigitalMarginRate - 1 : rawDigitalMarginRate;
  
  const rawOffsetMarginRate = cfgVal(marginConfigRows, "offset_markup", 0.07);
  const offsetMarginRate = rawOffsetMarginRate >= 1 ? rawOffsetMarginRate - 1 : rawOffsetMarginRate;
  const hayonSurcharge = 25;

  const hasCover = input.productType === "BROCHURE" && (input.pagesCover ?? 4) > 0;
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

  const methodAvailability = validateMethodAvailability(
    input,
    bindingType ?? null,
    laminationFinish ?? null,
    bindingTypes
  );

  const foldType = input.foldTypeId ? foldTypes.find(f => f.id === input.foldTypeId) : null;
  const foldCostRow = foldType?.costs.find(c => c.numFolds === input.foldCount);
  // XLSM fold model: calage (20 EUR fixed) + (qty / 1000) * rate_per_1000.
  // The FoldCost.cost column now stores the per-1000 rate.
  const FOLD_CALAGE = 20;
  const foldCost = foldCostRow
    ? FOLD_CALAGE + (input.quantity / 1000) * toNum(foldCostRow.cost)
    : 0;

  const productWidthCm = format.widthCm;
  const productHeightCm = format.heightCm;
  const openWidthCm = toNum(input.openFormat?.widthCm) || productWidthCm;
  const openHeightCm = toNum(input.openFormat?.heightCm) || productHeightCm;

  const machineFormatOptions = machineFormats.map(m => ({
    widthCm: toNum(m.widthCm) || 65,
    heightCm: toNum(m.heightCm) || 92,
    name: m.name ?? undefined,
  }));
  const optimal = machineFormatOptions.length > 0
    ? pickOptimalMachineFormat(productWidthCm, productHeightCm, machineFormatOptions, 0.3)
    : { widthCm: 65, heightCm: 92, posesPerSheet: calcPosesPerSheet({ productWidthCm, productHeightCm, machineWidthCm: 65, machineHeightCm: 92, bleedCm: 0.3 }), formatName: undefined, bascule: false };
  const machineWidthCm = optimal.widthCm;
  const machineHeightCm = optimal.heightCm;
  const posesPerSheet = optimal.posesPerSheet;

  const interiorPlatesPerSide = toNum(colorModeInterior?.platesPerSide ?? 4);
  const coverPlatesPerSideVal = toNum(colorModeCover?.platesPerSide ?? 4);
  const cahierStruct = hasCover
    ? calcCahierStructure(pagesInterior, posesPerSheet, interiorPlatesPerSide)
    : { numCahiers: 1, pagesPerCahier: 2, totalSheets: 1, cahiersCount: 1, totalPlatesInterior: interiorPlatesPerSide * 2 };

  // Piqure (stapled) brochures have no spine; only Dos carré collé has a spine
  const spineThickness = (hasCover && bindingType?.name?.toLowerCase().includes("dos carre"))
    ? estimateSpineThicknessCm(pagesInterior, input.paperInteriorGrammage ?? 90, input.paperInteriorTypeName)
    : 0;

  const weightPerCopyGrams = calcWeightPerCopyGrams({
    widthCm: productWidthCm,
    heightCm: productHeightCm,
    grammageInterior: input.paperInteriorGrammage ?? 90,
    grammageCouvreture: hasCover ? (input.paperCoverGrammage ?? null) : null,
    pagesInterior: hasCover ? pagesInterior : 2,
    hasCover,
    spineThicknessCm: spineThickness,
    weightPer1000SheetsInterior: interiorGrammage?.weightPer1000Sheets ? toNum(interiorGrammage.weightPer1000Sheets) : null,
    weightPer1000SheetsCover: hasCover && coverGrammage?.weightPer1000Sheets ? toNum(coverGrammage.weightPer1000Sheets) : null,
  });
  const weightTotalKg = (weightPerCopyGrams * input.quantity) / 1000;
  let packagingCost = calcPackagingCost(input.packaging, input.quantity, weightTotalKg);
  // Brochures: ajouter le coût des cartons (Excel) : ceil(Poids_Total_Kg / 10) × 1.00 €
  // Only when the user selected "Mise en cartons" (Excel: cell C40 = "Oui")
  if (input.productType === "BROCHURE" && weightTotalKg > 0 && input.packaging?.cartons) {
    const cartonCost = Math.ceil(weightTotalKg / 10) * 1.0;
    packagingCost = Math.round((packagingCost + cartonCost) * 100) / 100;
  }
  // --- Multi-carrier delivery: compute cost for each carrier, pick cheapest ---
  const deliveryPoints = input.deliveryPoints
    .filter(p => p.copies > 0 && p.departmentCode)
    .map(p => {
      const dept = departments.find(d => d.code === p.departmentCode);
      return {
        copies: p.copies,
        zone: dept?.zone ?? 3,
        hayon: p.hayon,
        departmentCode: p.departmentCode || undefined,
      };
    });

  let bestDeliveryResult = { points: [] as DeliveryPointResult[], total: 0 };
  let bestCarrierName = "(aucun)";

  // Fromentières logic limit (Bloc-note Phase 2: 'Livraison à fromtières si couture...')
  const isCouture = bindingType?.name?.toLowerCase().includes("couture") ?? false;
  const fromentieresPoint: DeliveryPoint = {
    copies: input.quantity,
    zone: departments.find(d => d.code === "53")?.zone ?? 3,
    hayon: false,
    departmentCode: "53", // Mayenne (Fromentières)
  };

  if (deliveryPoints.length > 0 || isCouture) {
    for (const carrier of carriers) {
      const rates: DeliveryRateData[] = (carrier.deliveryRates ?? []).map(r => ({
        zone: r.zone,
        maxWeightKg: toNum(r.maxWeightKg),
        price: toNum(r.price),
      }));

      let deptRates: DepartmentRateData[] = [];
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const deptRows = await (prisma as any).transportRateByDept.findMany({
          where: { carrierId: carrier.id },
        });
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        deptRates = (deptRows as any[]).map((r: any) => ({
          departmentCode: String(r.departmentCode).split(" - ")[0].trim(),
          maxWeightKg: toNum(r.maxWeightKg),
          price: toNum(r.price),
        }));
      } catch {
        // TransportRateByDept migration not yet applied
      }

      const deliveryConfigStr = { rates, hayonSurcharge, departmentRates: deptRates.length > 0 ? deptRates : undefined };
      
      let candidateTotal = 0;
      let result = { points: [] as DeliveryPointResult[], total: 0 };

      if (deliveryPoints.length > 0) {
         result = calcDeliveryCost(deliveryPoints, weightPerCopyGrams, deliveryConfigStr);
         candidateTotal = result.total;
      }

      if (isCouture) {
         // Aller Fromentières
         const allerResult = calcDeliveryCost([fromentieresPoint], weightPerCopyGrams, deliveryConfigStr);
         const allerCost = allerResult.total;
         const retourCost = allerCost; // Return shipping from binding to IMB

         // Simulate Option A (Depart Fromentieres -> direct to Client)
         // Note: Assuming our standard tables approximate 'Drop Ship from 53' cost.
         const optionA = allerCost + candidateTotal; 
         // Simulate Option B (Depart IMB -> retour from 53 to 14 + IMB to Client)
         // Note: if the client is local to 14, this might be a required routing, but mathematically A is generally cheaper.
         const optionB = allerCost + retourCost + candidateTotal;

         candidateTotal = Math.min(optionA, optionB);
         // Update the resulting total to include the binding transport overhead
         result.total = candidateTotal;
      }

      if (bestDeliveryResult.total === 0 || (candidateTotal > 0 && candidateTotal < bestDeliveryResult.total)) {
        bestDeliveryResult = result;
        bestCarrierName = carrier.name;
      }
    }
  }

  const deliveryResult = bestDeliveryResult;

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
    bindingRules: bindingType?.rules || undefined,
    laminationMode: input.laminationMode,
    laminationTiers: (laminationFinish?.digitalPriceTiers ?? []).map(t => ({
      qtyMin: t.qtyMin,
      qtyMax: t.qtyMax,
      pricePerSheet: toNum(t.pricePerSheet),
      setupCost: toNum(t.setupCost),
    })),
    config: digitalConfig,
    clickDivisors: digitalClickDivisors,
    foldCount: input.foldCount,
    packagingCost,
    numModels: (input as unknown as { numberOfModels?: number }).numberOfModels ?? 1,
    numPoses: Math.max(1, (getClickDivisorForFormat(digitalClickDivisors, openWidthCm, openHeightCm).recto || 1)),
  };

  let digitalBreakdown: DigitalBreakdown;
  let digitalError: string | null = null;
  if (!methodAvailability.digitalAvailable) {
    digitalError = methodAvailability.digitalReason ?? "Méthode numérique non disponible";
    digitalBreakdown = {
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
    };
  } else {
    try {
      digitalBreakdown = calcDigitalPrice(digitalInput);
    } catch (e) {
      digitalError = e instanceof Error ? e.message : "Erreur calcul numérique";
      digitalBreakdown = {
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
      };
    }
  }
  // Brochures (sans ×1.50): Total numérique HT = (Sous-total + Livraison) × 1.10 (marge 10%).
  // Autres: XLSM ×1.50 = pas de marge additionnelle; legacy = digitalMarginRate.
  const useDigitalMarkupModel = (digitalConfig.digitalMarkupMultiplier ?? 0) > 0;
  const isBrochureDigitalNoMarkup = input.productType === "BROCHURE" && hasCover;
  const brochureDigitalMarginRate = cfgVal(digitalConfigRows, "brochure_digital_margin", 0.10);
  const digitalTotal = digitalError
    ? 0
    : isBrochureDigitalNoMarkup
      ? (digitalBreakdown.subtotal + deliveryResult.total) * (1 + brochureDigitalMarginRate)
      : useDigitalMarkupModel
        ? digitalBreakdown.subtotal + deliveryResult.total
        : (digitalBreakdown.subtotal + deliveryResult.total) * (1 + digitalMarginRate);

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
    bindingOffsetTiers: (bindingType?.offsetPriceTiers ?? []).map(t => ({
      cahiersCount: t.cahiersCount,
      calageCost: toNum(t.calageCost),
      roulagePer1000: toNum(t.roulagePer1000),
    })),
    bindingRules: (bindingType?.rules as unknown as OffsetBindingRules) || undefined,
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
    packagingCost,
    cuttingCost: 0, // In Offset, Excel doesn't charge per-pose cutting explicitly; it's absorbed in setup/margins.
    hasColorModeVarnish: !!(colorModeInterior as { hasVarnish?: boolean } | null)?.hasVarnish || !!(colorModeCover as { hasVarnish?: boolean } | null)?.hasVarnish,
    // Phase 2: binding supplement context
    spineThicknessCm: spineThickness,
    encartedCahiers: input.encartedCahiers ?? 0,
    hasMixedCahiers: input.hasMixedCahiers ?? false,
    config: offsetConfig,
  };

  let offsetBreakdown: OffsetBreakdown;
  let offsetError: string | null = null;
  if (!methodAvailability.offsetAvailable) {
    offsetError = methodAvailability.offsetReason ?? "Méthode offset non disponible";
    offsetBreakdown = {
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
    };
  } else {
    try {
      offsetBreakdown = calcOffsetPrice(offsetInput);
    } catch (e) {
      offsetError = e instanceof Error ? e.message : "Erreur calcul offset";
      offsetBreakdown = {
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
      };
    }
  }
  const offsetSubtotal = Number(offsetBreakdown.subtotal);
  const offsetTotalRaw = (Number.isFinite(offsetSubtotal) ? offsetSubtotal : 0) + deliveryResult.total;
  const offsetTotal = offsetTotalRaw * (1 + offsetMarginRate);

  // --- Finishing extras (§11-13) ---
  const finishingExtras = calcFinishingExtras({
    uvVarnish: input.uvVarnishMode && input.uvVarnishMode !== "Rien" ? {
      mode: input.uvVarnishMode as "UV Brillant" | "UV Reserve",
      machineWidthCm,
      machineHeightCm,
      quantity: input.quantity,
    } : undefined,
    encartMode: (input.encartMode && input.encartMode !== "Rien" ? input.encartMode : null) as "Aléatoire" | "Non aléatoire" | null,
    recassageEnabled: input.recassageEnabled ?? false,
    numFlaps: input.flapSizeCm > 0 ? (input.flapSizeCm > 5 ? 2 : 1) : 0,
    quantity: input.quantity,
  });

  const safeOffsetTotal = offsetError ? 0 : (Number.isFinite(offsetTotal) ? Math.round(offsetTotal * 100) / 100 : 0);
  const safeOffsetBreakdown = {
    ...offsetBreakdown,
    paperCostInterior: toNum(offsetBreakdown.paperCostInterior),
    paperCostCover: toNum(offsetBreakdown.paperCostCover),
    plateCost: toNum(offsetBreakdown.plateCost),
    calageCost: toNum(offsetBreakdown.calageCost),
    runningCost: toNum(offsetBreakdown.runningCost),
    fileProcessing: toNum(offsetBreakdown.fileProcessing),
    bindingCost: toNum(offsetBreakdown.bindingCost),
    rainageCost: toNum(offsetBreakdown.rainageCost),
    laminationCost: toNum(offsetBreakdown.laminationCost),
    cuttingCost: toNum((offsetBreakdown as { cuttingCost?: number }).cuttingCost),
    packagingCost: toNum(offsetBreakdown.packagingCost),
    setupCostFlat: toNum((offsetBreakdown as { setupCostFlat?: number }).setupCostFlat),
    subtotal: toNum(offsetBreakdown.subtotal),
    deliveryCost: deliveryResult.total,
    margin: toNum(offsetBreakdown.margin),
    tauxDeMarque: (offsetBreakdown as { tauxDeMarque?: number }).tauxDeMarque,
    total: safeOffsetTotal,
  };

  const digitalClicks = getDigitalClicks(digitalInput);
  const clickDivisor = getClickDivisorForFormat(
    digitalClickDivisors,
    productWidthCm,
    productHeightCm
  );
  const varsInputs: CalculationVariable[] = [];
  const varsNumerique: CalculationVariable[] = [];
  const varsOffset: CalculationVariable[] = [];

  function addTo(arr: CalculationVariable[], name: string, value: string | number, formula?: string) {
    arr.push({ name, value, formula });
  }

  const rateInterior = (colorModeInterior?.platesPerSide ?? 4) >= 4 ? digitalConfig.colorClickRate : digitalConfig.monoClickRate;

  // ——— Entrées du devis (common) ———
  addTo(varsInputs, "Type de produit", input.productType ?? "");
  addTo(varsInputs, "Quantité", input.quantity);
  addTo(varsInputs, "Format (cm)", `${format.widthCm} × ${format.heightCm}`);
  addTo(varsInputs, "Pages intérieur", pagesInterior);
  addTo(varsInputs, "Pages couverture", hasCover ? (input.pagesCover ?? 4) : 0);
  addTo(varsInputs, "Rabat (cm)", hasCover ? (input.flapSizeCm ?? 0) : "—");
  addTo(varsInputs, "Recto-verso", input.rectoVerso ? "Oui" : "Non");
  addTo(varsInputs, "Papier intérieur (g/m²)", input.paperInteriorGrammage ?? "");
  addTo(varsInputs, "Papier couverture (g/m²)", hasCover ? (input.paperCoverGrammage ?? "") : "—");
  addTo(varsInputs, "Couleurs intérieur", colorModeInterior?.name ?? input.colorModeInteriorName ?? "");
  addTo(varsInputs, "Couleurs couverture", hasCover ? (colorModeCover?.name ?? input.colorModeCoverName ?? "") : "—");
  addTo(varsInputs, "Reliure", bindingType?.name ?? "—");
  addTo(varsInputs, "Pliage (nb plis)", input.foldCount ?? 0);
  addTo(varsInputs, "Pelliculage", input.laminationMode ?? "Rien");
  addTo(varsInputs, "Format machine retenu", optimal.formatName ?? `${machineWidthCm}×${machineHeightCm}`, "Optimal parmi 64×90, 65×92, 72×102");
  addTo(varsInputs, "Poses par feuille", posesPerSheet);
  addTo(varsInputs, "Poids par ex. (g)", Math.round(weightPerCopyGrams * 10) / 10);
  const p = input.packaging;
  const condParts: string[] = [];
  if (p?.film) condParts.push("Film");
  if (p?.cartons) condParts.push("Cartons");
  if (p?.elastiques) condParts.push("Élastiques");
  if ((p?.crystalBoxQty ?? 0) > 0) condParts.push(`Cristal × ${p!.crystalBoxQty}`);
  addTo(varsInputs, "Conditionnement", condParts.length ? condParts.join(", ") : "—");

  // ——— Numérique ———
  addTo(varsNumerique, "Tarif clic couleur (€)", digitalConfig.colorClickRate);
  addTo(varsNumerique, "Tarif clic N&B (€)", digitalConfig.monoClickRate);
  addTo(varsNumerique, "Mise en route couleur (€)", digitalConfig.setupColor);
  addTo(varsNumerique, "Mise en route N&B (€)", digitalConfig.setupMono);
  addTo(varsNumerique, "Traitement fichier (€)", digitalConfig.fileProcessing);
  addTo(varsNumerique, "Diviseur mise en route", digitalConfig.setupDivisor);

  addTo(
    varsNumerique,
    "Clics intérieur (nombre)",
    Math.round(digitalClicks.clicksInterior),
    hasCover
      ? `(Pages × Quantité) / (Diviseur RV × 2) = ${pagesInterior} × ${input.quantity} / (${clickDivisor.rv} × 2) = ${Math.round(digitalClicks.clicksInterior)}`
      : `Quantité / Diviseur = ${input.quantity} / ${input.rectoVerso ? clickDivisor.rv : clickDivisor.recto} = ${Math.round(digitalClicks.clicksInterior)}`
  );
  addTo(
    varsNumerique,
    "Clics couverture (nombre)",
    Math.round(digitalClicks.clicksCover),
    hasCover ? `(4 × Quantité) / (Diviseur RV × 2) = 4 × ${input.quantity} / (${clickDivisor.rv} × 2) = ${Math.round(digitalClicks.clicksCover)}` : undefined
  );

  addTo(
    varsNumerique,
    "Coût clics intérieur (€)",
    Math.round(digitalBreakdown.clickCostInterior * 100) / 100,
    `Clics intérieur × Tarif clic = ${Math.round(digitalClicks.clicksInterior)} × ${rateInterior} = ${(Math.round(digitalBreakdown.clickCostInterior * 100) / 100).toFixed(2)}`
  );
  addTo(
    varsNumerique,
    "Coût clics couverture (€)",
    Math.round(digitalBreakdown.clickCostCover * 100) / 100,
    hasCover
      ? `Clics couverture × Tarif clic couleur = ${Math.round(digitalClicks.clicksCover)} × ${digitalConfig.colorClickRate} = ${(Math.round(digitalBreakdown.clickCostCover * 100) / 100).toFixed(2)}`
      : undefined
  );
  addTo(
    varsNumerique,
    "Papier intérieur (num.)",
    Math.round(digitalBreakdown.paperCostInterior * 100) / 100,
    `(Clics int. / 1000) × Poids 1000 feuilles × Prix/kg = (${Math.round(digitalClicks.clicksInterior)}/1000) × …`
  );
  addTo(
    varsNumerique,
    "Papier couverture (num.)",
    Math.round(digitalBreakdown.paperCostCover * 100) / 100,
    hasCover && digitalBreakdown.paperCostCover
      ? `(Clics couv. / 1000) × Poids 1000 feuilles × Prix/kg`
      : undefined
  );
  addTo(
    varsNumerique,
    "Mise en route (€)",
    Math.round(digitalBreakdown.setupCost * 100) / 100,
    `(Mise en route couleur + N&B) / Diviseur = (${digitalConfig.setupColor} + ${digitalConfig.setupMono}) / ${digitalConfig.setupDivisor} = ${(digitalBreakdown.setupCost).toFixed(2)}`
  );
  addTo(varsNumerique, "Traitement fichier (€)", Math.round(digitalBreakdown.fileProcessing * 100) / 100, hasCover ? "Forfait brochures (45 €)" : "Forfait dépliant/flyer (10 €)");
  addTo(varsNumerique, "Reliure (num.)", Math.round(digitalBreakdown.bindingCost * 100) / 100, "Selon type et tranche (pages × quantité)");
  addTo(varsNumerique, "Pelliculage (num.)", Math.round(digitalBreakdown.laminationCost * 100) / 100, "Feuilles à pelliculer × tarif feuille (+ setup si tranche)");
  addTo(varsNumerique, "Pliage (num.) (€)", Math.round((digitalBreakdown.foldCost ?? 0) * 100) / 100, `Forfait ${input.foldCount ?? 0} pli(s) + quantité × tarif`);
  addTo(varsNumerique, "Coupe (num.) (€)", Math.round(digitalBreakdown.cuttingCost * 100) / 100, "Poses × 0.85 + Modèles × 1.25");
  addTo(varsNumerique, "Papier + Clics × 1.50 (€)", Math.round((digitalBreakdown.paperAndClicksMarkedUp ?? 0) * 100) / 100, "(Papier + Clics) × 1.50");
  addTo(varsNumerique, "Conditionnement (num.) (€)", Math.round(digitalBreakdown.packagingCost * 100) / 100, "Film / cartons / élastiques / coffrets");
  const useMarkupModel = (digitalConfig.digitalMarkupMultiplier ?? 0) > 0;
  const effectiveDigitalMarginPct = isBrochureDigitalNoMarkup ? brochureDigitalMarginRate * 100 : (useMarkupModel ? 0 : digitalMarginRate * 100);
  addTo(
    varsNumerique,
    "Sous-total numérique (€)",
    Math.round(digitalBreakdown.subtotal * 100) / 100,
    isBrochureDigitalNoMarkup
      ? "Papier + Clics + Fichier + Reliure + Pelliculage + Coupe + Conditionnement (sans ×1.50)"
      : useMarkupModel
        ? "(Papier + Clics) × 1.50 + Fichier + Reliure + Pelliculage + Coupe"
        : "Clics int. + Clics couv. + Papier + Mise en route + Fichier + Reliure + Pelliculage"
  );
  addTo(varsNumerique, "Livraison (€)", Math.round(deliveryResult.total * 100) / 100, "Par point : zone × poids → tarif transport (+ hayon si demandé)");
  addTo(
    varsNumerique,
    "Marge numérique (%)",
    effectiveDigitalMarginPct,
    isBrochureDigitalNoMarkup ? "Appliquée sur (Sous-total + Livraison)" : useMarkupModel ? "Inclus dans × 1.50 (XLSM)" : "Appliquée sur (Sous-total + Livraison)"
  );
  addTo(
    varsNumerique,
    "Total numérique HT (€)",
    Math.round(digitalTotal * 100) / 100,
    isBrochureDigitalNoMarkup
      ? `(Sous-total numérique + Livraison) × (1 + 10%) = (${(digitalBreakdown.subtotal).toFixed(2)} + ${deliveryResult.total.toFixed(2)}) × 1.10`
      : useMarkupModel
        ? `Sous-total numérique + Livraison = ${(digitalBreakdown.subtotal).toFixed(2)} + ${deliveryResult.total.toFixed(2)}`
        : `(Sous-total numérique + Livraison) × (1 + Marge %) = (${(digitalBreakdown.subtotal).toFixed(2)} + ${deliveryResult.total.toFixed(2)}) × (1 + ${(digitalMarginRate * 100).toFixed(0)}%)`
  );

  // ——— Offset ———
  addTo(varsOffset, "Plaque (€)", offsetConfig.plateCost);
  addTo(varsOffset, "Plaque grand format (€)", offsetConfig.plateCostLarge);
  addTo(varsOffset, "Calage/plaque (€)", offsetConfig.calagePerPlate);
  addTo(varsOffset, "Traitement fichier (€/traitement)", offsetConfig.fileProcessingPerTreatment);
  addTo(varsOffset, "Gâche calage (feuilles)", offsetConfig.gacheCalage);
  addTo(varsOffset, "Gâche vernis (feuilles/plaque)", offsetConfig.gacheVernis);
  addTo(varsOffset, "Marge papier (%)", offsetConfig.paperMarginRate * 100);

  const totalPlates = hasCover
    ? cahierStruct.numCahiers * toNum(colorModeInterior?.platesPerSide ?? 4) * 2 + toNum(colorModeCover?.platesPerSide ?? 4) * 2
    : (input.rectoVerso ? 2 : 1) * toNum(colorModeInterior?.platesPerSide ?? 4);
  const numPlates = totalPlates;
  const baseSheets = Math.ceil(input.quantity / posesPerSheet);
  // gacheCalageSheets is computed below with numPressRuns (not numPlates)
  const hasVarnish = (colorModeInterior as { hasVarnish?: boolean } | null)?.hasVarnish ?? (colorModeCover as { hasVarnish?: boolean } | null)?.hasVarnish ?? false;
  const gacheVernisSheets = hasVarnish ? numPlates * offsetConfig.gacheVernis : 0;
  addTo(varsOffset, "Nombre de plaques (calculé)", numPlates, "Plaques/face × faces (+ couv si applicable)");
  addTo(varsOffset, "Feuilles base (tirage)", baseSheets, "CEIL(quantité / poses)");
  // Gâche calage is per PRESS RUN (cahier), not per plate
  const numPressRuns = hasCover ? cahierStruct.numCahiers + 1 : (input.rectoVerso ? 2 : 1);
  const gacheCalageSheets = numPressRuns * offsetConfig.gacheCalage;
  addTo(varsOffset, "Passages presse (cahiers + couv)", numPressRuns, hasCover ? `${cahierStruct.numCahiers} cahiers + 1 couverture` : `${numPressRuns} passage(s)`);
  addTo(varsOffset, "Gâche calage (feuilles tot.)", gacheCalageSheets, `Passages × ${offsetConfig.gacheCalage}`);
  addTo(varsOffset, "Gâche vernis (feuilles tot.)", gacheVernisSheets, "Nb plaques × 2 si hasVernis");
  addTo(varsOffset, "Feuilles total avec gâche", Math.round(baseSheets + gacheCalageSheets + gacheVernisSheets), "Base + gâche calage + gâche vernis");
  addTo(
    varsOffset,
    "Papier intérieur (off.)",
    Math.round(safeOffsetBreakdown.paperCostInterior * 100) / 100,
    "Feuilles (avec gâche) × surface × grammage × prix/kg × (1 + marge papier)"
  );
  addTo(
    varsOffset,
    "Papier couverture (off.)",
    Math.round(safeOffsetBreakdown.paperCostCover * 100) / 100,
    hasCover ? "Feuilles (avec gâche) × surface × grammage × prix/kg × (1 + marge)" : undefined
  );
  addTo(
    varsOffset,
    "Plaques (€)",
    Math.round(safeOffsetBreakdown.plateCost * 100) / 100,
    `Nombre de plaques × Coût plaque = ${totalPlates} × ${offsetConfig.plateCost} = ${(safeOffsetBreakdown.plateCost).toFixed(2)}`
  );
  addTo(
    varsOffset,
    "Calage (€)",
    Math.round(safeOffsetBreakdown.calageCost * 100) / 100,
    `Nombre de plaques × Calage/plaque = ${totalPlates} × ${offsetConfig.calagePerPlate} = ${(safeOffsetBreakdown.calageCost).toFixed(2)}`
  );
  addTo(varsOffset, "Roulage (€)", Math.round(safeOffsetBreakdown.runningCost * 100) / 100, "Feuilles / 1000 × Tarif tier (selon volume)");
  const numTreatments = hasCover ? 2 : 1;
  addTo(
    varsOffset,
    "Fichiers (€)",
    Math.round(safeOffsetBreakdown.fileProcessing * 100) / 100,
    `Traitements × Tarif = ${numTreatments} × ${offsetConfig.fileProcessingPerTreatment}`
  );
  addTo(varsOffset, "Reliure (off.)", Math.round(safeOffsetBreakdown.bindingCost * 100) / 100, "Calage forfait + (quantité/1000 × roulage/1000)");
  if (safeOffsetBreakdown.bindingSurchargeDetail) {
    addTo(varsOffset, "Suppléments reliure", safeOffsetBreakdown.bindingSurchargeDetail);
  }
  addTo(varsOffset, "Rainage (off.)", Math.round(safeOffsetBreakdown.rainageCost * 100) / 100, hasCover ? `Calage + quantité/1000 × tarif (${cahierStruct.numCahiers} cahiers)` : undefined);
  addTo(varsOffset, "Pelliculage (off.)", Math.round(safeOffsetBreakdown.laminationCost * 100) / 100, "Max(forfait + surface × qty × tarif/m², minimum facturable)");
  addTo(varsOffset, "Pliage (€)", Math.round(safeOffsetBreakdown.foldCost * 100) / 100, "Tarif selon type de pli (table FoldCost)");
  addTo(varsOffset, "Coupe (off.) (€)", Math.round(safeOffsetBreakdown.cuttingCost * 100) / 100, "Coupe dépliant/flyer");
  if (packagingCost > 0) addTo(varsOffset, "Conditionnement (€)", Math.round(packagingCost * 100) / 100, "Film / cartons / élastiques / coffrets");
  addTo(varsOffset, "Taux de marque (%)", Math.round((safeOffsetBreakdown.tauxDeMarque ?? 0) * 10000) / 100, "1 − coût/vente");
  addTo(
    varsOffset,
    "Coût fixe (forfait plat)",
    Math.round((safeOffsetBreakdown.setupCostFlat ?? 0) * 100) / 100,
    (safeOffsetBreakdown.setupCostFlat ?? 0) > 0 ? "50 € appliqué uniquement au tirage plat/dépliant/flyer" : undefined
  );
  
  // --- TECH DATA FOR GROUP B: AMALGAMATION / BATCH EXPORT ---
  if (safeOffsetBreakdown.techNbFeuillesInt !== undefined) {
    addTo(varsOffset, "Tech: Nb Feuilles Intérieur", safeOffsetBreakdown.techNbFeuillesInt ?? 0, "[GROUP B] Base needed parent sheets before waste");
    addTo(varsOffset, "Tech: Nb Feuilles Passe Int", safeOffsetBreakdown.techNbFeuillesPasseInt ?? 0, "[GROUP B] Waste/Spoilage sheets for inside");
    addTo(varsOffset, "Tech: Nb Plaques Intérieur", safeOffsetBreakdown.techNbPlaquesInt ?? 0, "[GROUP B] Number of plates needed for inside pages");
    addTo(varsOffset, "Tech: Nb 1000 de roule", safeOffsetBreakdown.techNb1000Roule ?? 0, "[GROUP B] Thousands of machine passes (Roller impressions)");
    addTo(varsOffset, "Tech: Nb de cahiers", safeOffsetBreakdown.techNbCahiers ?? 0, "[GROUP B] Number of signatures (cahiers) to fold");
  }

  addTo(
    varsOffset,
    "Sous-total offset (€)",
    Math.round(safeOffsetBreakdown.subtotal * 100) / 100,
    "Papier + Plaques + Calage + Roulage + Fichiers + Reliure + Pelliculage + Pliage + Fixe"
  );
  addTo(varsOffset, "Livraison (€)", Math.round(deliveryResult.total * 100) / 100, "Par point : zone × poids → tarif transport (+ hayon si demandé)");
  addTo(varsOffset, "Marge offset (%)", offsetMarginRate * 100, "Appliquée sur (Sous-total + Livraison)");
  addTo(
    varsOffset,
    "Total offset HT (€)",
    safeOffsetTotal,
    `(Sous-total offset + Livraison) × (1 + Marge %) = (${safeOffsetBreakdown.subtotal.toFixed(2)} + ${deliveryResult.total.toFixed(2)}) × (1 + ${(offsetMarginRate * 100).toFixed(0)}%)`
  );

  const bestMethod: "digital" | "offset" = offsetError
    ? "digital"
    : digitalError
      ? "offset"
      : digitalTotal <= safeOffsetTotal
        ? "digital"
        : "offset";
  const bestTotal =
    digitalError && offsetError ? 0 : offsetError ? digitalTotal : digitalError ? safeOffsetTotal : Math.min(digitalTotal, safeOffsetTotal);
  const ecart =
    digitalError || offsetError ? 0 : Math.round((digitalTotal - safeOffsetTotal) * 100) / 100;

  return {
    digitalTotal: Math.round(digitalTotal * 100) / 100,
    offsetTotal: safeOffsetTotal,
    digitalBreakdown: { ...digitalBreakdown, deliveryCost: deliveryResult.total, total: digitalTotal },
    offsetBreakdown: safeOffsetBreakdown,
    deliveryCost: deliveryResult.total,
    weightPerCopyGrams,
    currency: "EUR",
    bestTotal,
    bestMethod,
    ecart,
    finishingExtras,
    calculationVariablesInputs: varsInputs,
    calculationVariablesNumerique: varsNumerique,
    calculationVariablesOffset: varsOffset,
    digitalError: digitalError ?? undefined,
    offsetError: offsetError ?? undefined,
    digitalSuggestion: methodAvailability.suggestions.forDigital ?? undefined,
    offsetSuggestion: methodAvailability.suggestions.forOffset ?? undefined,
    bestCarrierName,
  };
}