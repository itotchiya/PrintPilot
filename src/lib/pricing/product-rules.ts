import type { ProductType } from "./types";

export function isBrochure(p: ProductType | null) {
  return p === "BROCHURE";
}
export function isDepliant(p: ProductType | null) {
  return p === "DEPLIANT";
}
export function isFlyer(p: ProductType | null) {
  return p === "FLYER";
}
export function isCarte(p: ProductType | null) {
  return p === "CARTE_DE_VISITE";
}

export function canHaveCover(p: ProductType | null) {
  return p === "BROCHURE";
}
export function canHaveInterior(p: ProductType | null) {
  return p === "BROCHURE";
}
export function canHaveBinding(p: ProductType | null) {
  return p === "BROCHURE";
}
export function mustHaveBinding(p: ProductType | null) {
  return p === "BROCHURE";
}
export function canHaveFolds(p: ProductType | null) {
  return p === "DEPLIANT";
}
export function mustHaveFolds(p: ProductType | null) {
  return p === "DEPLIANT";
}
export function canHaveRectoVerso(p: ProductType | null) {
  return p !== "BROCHURE";
}
export function canHaveCrystalBox(p: ProductType | null) {
  return p !== "BROCHURE";
}

export function getMinPages(bindingName: string | null): number {
  if (!bindingName) return 4;
  if (bindingName.includes("Dos carre")) return 40;
  return 4; // Piqure
}

export function getMaxPages(bindingName: string | null): number | null {
  if (!bindingName) return null;
  if (bindingName === "Piqure") return 96;
  return null; // unlimited for Dos carre types
}

export function isPagesValid(
  pages: number,
  bindingName: string | null
): boolean {
  if (pages <= 0 || pages % 4 !== 0) return false;
  const min = getMinPages(bindingName);
  const max = getMaxPages(bindingName);
  if (pages < min) return false;
  if (max !== null && pages > max) return false;
  return true;
}

export function calcOpenFormat(
  widthCm: number,
  heightCm: number,
  productType: ProductType | null,
  foldCount: number,
  secondaryFoldType: "Pli Croise" | null,
  secondaryFoldCount: number
): { widthCm: number; heightCm: number } {
  if (productType === "BROCHURE") {
    return { widthCm: widthCm * 2, heightCm };
  }
  if (productType === "DEPLIANT") {
    const openWidth = widthCm * (foldCount + 1);
    const openHeight =
      secondaryFoldType === "Pli Croise" && secondaryFoldCount > 0
        ? heightCm * (secondaryFoldCount + 1)
        : heightCm;
    return { widthCm: openWidth, heightCm: openHeight };
  }
  return { widthCm, heightCm };
}

// ── Fold grammage limits (CLAUDE.md §3.4, from Réglages_Presses.csv rows 65-69) ──
// Maximum grammage (g/m²) per fold type × pli count. Null = forbidden combination.
const FOLD_GRAMMAGE_LIMITS: Record<string, (number | null)[]> = {
  // Index: [0]=unused, [1]=1pli, [2]=2plis, [3]=3plis, [4]=4plis, [5]=5plis, [6]=6plis
  "croise":     [null, 270, 250, 150, 115, 115, 115],
  "roule":      [null, 270, 250, 200, 200, 200, 135],
  "economique": [null, 270, 270, 200, 170, null, null],
  "accordeon":  [null, null, 270, 250, 200, 170, 170], // 1 pli accordéon = FORBIDDEN
};

export interface FoldGrammageResult {
  valid: boolean;
  maxGrammage: number | null;
  reason?: string;
}

/**
 * Validates whether a fold type + count is allowed for the given grammage.
 * Returns maxGrammage for the combination and whether it's valid.
 * XLSM rules: "1 pli accordéon" is explicitly forbidden.
 */
export function validateFoldGrammage(
  foldTypeName: string | null,
  foldCount: number,
  grammage: number
): FoldGrammageResult {
  if (!foldTypeName || foldCount <= 0) return { valid: true, maxGrammage: null };

  const key = foldTypeName.toLowerCase()
    .replace(/[éè]/g, "e")
    .replace(/[ô]/g, "o")
    .replace(/pli\s*/i, "")
    .trim();

  // Find matching fold type
  let limits: (number | null)[] | undefined;
  for (const [k, v] of Object.entries(FOLD_GRAMMAGE_LIMITS)) {
    if (key.includes(k)) { limits = v; break; }
  }
  if (!limits) return { valid: true, maxGrammage: null }; // Unknown fold type: no limit

  if (foldCount > limits.length - 1) {
    return { valid: false, maxGrammage: null, reason: `${foldTypeName} ne supporte pas ${foldCount} plis` };
  }

  const maxGrammage = limits[foldCount];
  if (maxGrammage === null) {
    // Forbidden combination (e.g. 1 pli accordéon, or 5+ plis économique)
    return {
      valid: false,
      maxGrammage: null,
      reason: key.includes("accordeon") && foldCount === 1
        ? "1 pli accordéon est interdit"
        : `${foldTypeName} ${foldCount} pli(s) n'est pas supporté`,
    };
  }

  if (grammage > maxGrammage) {
    return {
      valid: false,
      maxGrammage,
      reason: `Grammage ${grammage}g dépasse le max ${maxGrammage}g pour ${foldTypeName} ${foldCount} pli(s)`,
    };
  }

  return { valid: true, maxGrammage };
}

// ── Pli croisé specific constraints (§3.4) ──
// Max 2 plis, max grammage 150g
export function validateCrossFold(foldCount: number, grammage: number): FoldGrammageResult {
  if (foldCount > 2) {
    return { valid: false, maxGrammage: 150, reason: "Pli croisé : maximum 2 plis" };
  }
  const maxG = foldCount === 1 ? 270 : foldCount === 2 ? 250 : 150;
  if (grammage > maxG) {
    return { valid: false, maxGrammage: maxG, reason: `Pli croisé ${foldCount} pli(s) : max ${maxG}g` };
  }
  return { valid: true, maxGrammage: maxG };
}

// Steps visible for each product type (7 steps: 4=Elements 1, 5=Elements 2 only for brochure)
export function getVisibleSteps(p: ProductType | null): number[] {
  if (p === "BROCHURE") return [1, 2, 3, 4, 5, 6, 7];
  if (p === "DEPLIANT") return [1, 2, 4, 6, 7];
  if (p === "FLYER") return [1, 2, 4, 6, 7];
  if (p === "CARTE_DE_VISITE") return [1, 2, 4, 6, 7];
  return [1, 2, 3, 4, 5, 6, 7];
}

export function getStepLabel(step: number): string {
  const labels: Record<number, string> = {
    1: "Produit",
    2: "Quantité & Format",
    3: "Pages",
    4: "Elements 1",
    5: "Elements 2",
    6: "Livraison",
    7: "Récapitulatif",
  };
  return labels[step] ?? `Étape ${step}`;
}
