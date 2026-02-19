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

// Steps visible for each product type (7 steps: 4=Couverture, 5=Intérieur only for brochure)
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
    4: "Couverture",
    5: "Intérieur",
    6: "Livraison",
    7: "Récapitulatif",
  };
  return labels[step] ?? `Étape ${step}`;
}
