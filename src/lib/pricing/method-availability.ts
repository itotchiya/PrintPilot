import type { QuoteInput } from "./types";

/** Minimal binding type shape for validation (from Prisma include). */
export interface BindingTypeForValidation {
  id: string;
  name: string;
  digitalPriceTiers: unknown[];
  offsetPriceTiers: unknown[];
}

/** Minimal lamination finish shape for validation. */
export interface LaminationFinishForValidation {
  id: string;
  name: string;
  digitalPriceTiers?: unknown[];
  offsetPricePerM2?: unknown;
  offsetCalageForfait?: unknown;
  offsetMinimumBilling?: unknown;
}

export interface MethodAvailabilityResult {
  digitalAvailable: boolean;
  offsetAvailable: boolean;
  digitalReason?: string;
  offsetReason?: string;
  suggestions: {
    forDigital?: string;
    forOffset?: string;
  };
}

/** Piqûre has hardcoded fallback in digital.ts when tiers are empty. */
const PIQURE_NAMES = ["piqure", "piqûre", "piqûres", "piqures"];

function isPiqure(name: string | null | undefined): boolean {
  if (!name) return false;
  const n = name.toLowerCase().trim();
  return PIQURE_NAMES.some((p) => n.includes(p) || n === p);
}

function hasOffsetLaminationConfig(
  lf: LaminationFinishForValidation | null
): boolean {
  if (!lf) return false;
  const perM2 = Number(lf.offsetPricePerM2 ?? 0);
  const calage = Number(lf.offsetCalageForfait ?? 0);
  return perM2 > 0 || calage > 0;
}

function hasDigitalLaminationTiers(
  lf: LaminationFinishForValidation | null
): boolean {
  if (!lf) return false;
  const tiers = lf.digitalPriceTiers ?? [];
  return Array.isArray(tiers) && tiers.length > 0;
}

/**
 * Validates whether the selected options allow digital and/or offset pricing.
 * Returns availability flags, reasons when unavailable, and suggestions.
 */
export function validateMethodAvailability(
  input: QuoteInput,
  bindingType: BindingTypeForValidation | null,
  laminationFinish: LaminationFinishForValidation | null,
  allBindingTypes: BindingTypeForValidation[]
): MethodAvailabilityResult {
  const digitalReasons: string[] = [];
  const offsetReasons: string[] = [];
  const suggestionsForDigital: string[] = [];
  const suggestionsForOffset: string[] = [];

  const hasCover =
    input.productType === "BROCHURE" && (input.pagesCover ?? 4) > 0;
  const hasLamination = input.laminationMode && input.laminationMode !== "Rien";

  // ─── Binding (BROCHURE only) ─────────────────────────────────────────────
  if (hasCover && bindingType) {
    const name = bindingType.name ?? input.bindingTypeName ?? "cette reliure";
    const hasDigitalTiers =
      Array.isArray(bindingType.digitalPriceTiers) &&
      bindingType.digitalPriceTiers.length > 0;
    const hasOffsetTiers =
      Array.isArray(bindingType.offsetPriceTiers) &&
      bindingType.offsetPriceTiers.length > 0;

    if (!hasDigitalTiers && !isPiqure(name)) {
      digitalReasons.push(
        `La reliure « ${name} » n'est pas proposée en impression numérique.`
      );
      const digitalBindings = allBindingTypes.filter(
        (b) =>
          (Array.isArray(b.digitalPriceTiers) && b.digitalPriceTiers.length > 0) ||
          isPiqure(b.name)
      );
      if (digitalBindings.length > 0) {
        const names = digitalBindings.map((b) => `« ${b.name} »`).join(", ");
        suggestionsForDigital.push(
          `Changer pour ${names} pour obtenir un prix numérique.`
        );
      } else {
        suggestionsForDigital.push(
          "Passer en impression offset pour ce type de reliure."
        );
      }
    }

    if (!hasOffsetTiers) {
      offsetReasons.push(
        `La reliure « ${name} » n'a pas de tarif offset configuré.`
      );
      const offsetBindings = allBindingTypes.filter(
        (b) =>
          Array.isArray(b.offsetPriceTiers) && b.offsetPriceTiers.length > 0
      );
      if (offsetBindings.length > 0) {
        const names = offsetBindings.map((b) => `« ${b.name} »`).join(", ");
        suggestionsForOffset.push(
          `Changer pour ${names} ou passer en impression numérique.`
        );
      } else {
        suggestionsForOffset.push(
          "Changer la reliure ou passer en impression numérique."
        );
      }
    }

    // FIX 3.2: "Dos carré collé avec couture" is offset-only (Fromentières bindery)
    const lowerName = name.toLowerCase();
    if (lowerName.includes("couture")) {
      if (digitalReasons.length === 0) {
        digitalReasons.push(
          `La reliure « ${name} » n'est disponible qu'en impression offset.`
        );
        suggestionsForDigital.push(
          "Choisir « Dos carré collé » ou « Piqûre » pour un prix numérique."
        );
      }
    }
  }

  // ─── Lamination ─────────────────────────────────────────────────────────
  if (hasLamination && laminationFinish) {
    const name =
      laminationFinish.name ?? input.laminationFinishName ?? "cette finition";

    if (!hasDigitalLaminationTiers(laminationFinish)) {
      digitalReasons.push(
        `Le pelliculage « ${name} » n'est pas proposé en impression numérique.`
      );
      suggestionsForDigital.push(
        "Choisir « Rien » pour le pelliculage ou passer en offset."
      );
    }

    if (!hasOffsetLaminationConfig(laminationFinish)) {
      offsetReasons.push(
        `Le pelliculage « ${name} » n'a pas de tarif offset configuré.`
      );
      suggestionsForOffset.push(
        "Choisir « Rien » pour le pelliculage ou passer en numérique."
      );
    }
  }

  return {
    digitalAvailable: digitalReasons.length === 0,
    offsetAvailable: offsetReasons.length === 0,
    digitalReason:
      digitalReasons.length > 0 ? digitalReasons.join(" ") : undefined,
    offsetReason:
      offsetReasons.length > 0 ? offsetReasons.join(" ") : undefined,
    suggestions: {
      forDigital:
        suggestionsForDigital.length > 0
          ? suggestionsForDigital.join(" ")
          : undefined,
      forOffset:
        suggestionsForOffset.length > 0
          ? suggestionsForOffset.join(" ")
          : undefined,
    },
  };
}
