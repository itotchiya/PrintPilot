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
 * Implements XLSM PreCheck_Config (CLAUDE.md §21) + Feuil14 rules (§20).
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

  // ─── XLSM PreCheck_Config (CLAUDE.md §21) ─────────────────────────────
  const pagesInt = input.pagesInterior ?? 0;
  const pagesCouv = input.pagesCover ?? 0;
  const flapSize = input.flapSizeCm ?? 0;

  if (input.productType === "BROCHURE" && flapSize > 0) {
    // Digital printing cannot handle cover flaps (from Group 1 reverse macro rules)
    digitalReasons.push("L'impression numérique ne prend pas en charge les couvertures avec rabats.");
    suggestionsForDigital.push("Retirer le rabat pour activer le numérique.");
  }

  if (input.productType === "BROCHURE" && pagesInt > 0) {
    // §21.1-3: Pages intérieur must be ≥ 4 and multiple of 4
    if (pagesInt < 4) {
      const msg = "Pages intérieur doit être ≥ 4.";
      digitalReasons.push(msg);
      offsetReasons.push(msg);
    } else if (pagesInt % 4 !== 0) {
      const msg = "Pages intérieur doit être un multiple de 4.";
      digitalReasons.push(msg);
      offsetReasons.push(msg);
    }
    // §21.4-5: Pages couverture must be 0, 2, or 4
    if (pagesCouv !== 0 && pagesCouv !== 2 && pagesCouv !== 4) {
      const msg = "Pages couverture doit être 0, 2 ou 4.";
      digitalReasons.push(msg);
      offsetReasons.push(msg);
    }
  }

  // ─── DCC-specific pre-checks (CLAUDE.md §20.4, §20.5, §21.7) ──────────
  const bindingName = (bindingType?.name ?? input.bindingTypeName ?? "").toLowerCase();
  const isDCC = bindingName.includes("dos carre") || bindingName.includes("dos carré");

  if (isDCC && input.productType === "BROCHURE") {
    // §21.7 / §20.4: DCC requires interior pages ≥ 32 (Resolved anomaly: DB supports >= 32)
    if (pagesInt < 32) {
      const msg = `Dos carré collé nécessite minimum 32 pages intérieures (actuellement ${pagesInt}).`;
      digitalReasons.push(msg);
      offsetReasons.push(msg);
      suggestionsForDigital.push("Augmenter le nombre de pages ou choisir Piqûre.");
      suggestionsForOffset.push("Augmenter le nombre de pages ou choisir Piqûre.");
    }
    // §20.5: DCC requires cover (pagesCover > 0)
    if (pagesCouv === 0) {
      const msg = "Dos carré collé nécessite une couverture (pages couverture > 0).";
      digitalReasons.push(msg);
      offsetReasons.push(msg);
    }
    // §20.5: DCC requires cover grammage ≥ 170g
    const coverGrammage = input.paperCoverGrammage ?? 0;
    if (coverGrammage > 0 && coverGrammage < 170) {
      const msg = `Dos carré collé nécessite un grammage couverture ≥ 170g (actuellement ${coverGrammage}g).`;
      digitalReasons.push(msg);
      offsetReasons.push(msg);
      suggestionsForDigital.push("Choisir un grammage couverture ≥ 170g.");
      suggestionsForOffset.push("Choisir un grammage couverture ≥ 170g.");
    }
  }

  // ─── §20.1: Pelliculage RectoVerso + DCC mutual exclusion ──────────────
  if (isDCC && input.laminationMode === "Pelliculage Recto Verso") {
    const msg = "Pelliculage Recto Verso est incompatible avec Dos carré collé.";
    digitalReasons.push(msg);
    offsetReasons.push(msg);
    suggestionsForDigital.push("Choisir « Pelliculage Recto » ou « Rien ».");
    suggestionsForOffset.push("Choisir « Pelliculage Recto » ou « Rien ».");
  }

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
