import type { QuoteInput, WizardStep } from "./types";
import {
  canHaveCover,
  canHaveInterior,
  canHaveFolds,
  isPagesValid,
  validateFoldGrammage,
} from "./product-rules";

export interface StepValidationResult {
  valid: boolean;
  missing?: string[];
}

/** XLSM/VBA validation rules: returns all violation messages for the current quote. */
export function validateQuoteRules(data: QuoteInput): string[] {
  const errors: string[] = [];
  const pt = data.productType;
  const bindingName = data.bindingTypeName ?? "";
  const isDosCarre = /Dos carr[eé]|PUR|couture/i.test(bindingName);
  const pagesInterior = data.pagesInterior ?? 0;
  const pagesCover = data.pagesCover ?? 0;
  const totalPages = pagesInterior + pagesCover;

  // 1. Cover pelliculage forbidden if cover grammage < 170g
  if (pt === "BROCHURE" && data.laminationMode !== "Rien") {
    const covG = data.paperCoverGrammage ?? 0;
    if (covG > 0 && covG < 170) errors.push("Pelliculage couverture interdit si grammage couverture < 170 g");
  }

  // 2. Pelliculage Recto Verso forbidden with Dos carré / PUR / couture
  if (isDosCarre && data.laminationMode === "Pelliculage Recto Verso")
    errors.push("Pelliculage recto-verso interdit avec dos carré collé / PUR / couture");

  // 3. Flat products: pelliculage only if Flyer/Poster/Carte AND grammage ≥ 170g
  if (pt !== "BROCHURE" && pt !== null && data.laminationMode !== "Rien") {
    const g = data.paperInteriorGrammage ?? 0;
    if (g > 0 && g < 170) errors.push("Pelliculage dépliant/flyer/carte : grammage ≥ 170 g requis");
    // Group C: If product is a Folded leaflet (Dépliant), clear/reject lamination
    if (pt === "DEPLIANT") errors.push("Le pelliculage est interdit pour les dépliants");
  }

  // 5. Dos carré requires ≥ 32 interior pages (A5) (Resolved anomaly: DB supports >= 32)
  if (isDosCarre && pagesInterior < 32) errors.push("Dos carré collé : au moins 32 pages intérieures");

  // 6. Dos carré requires cover (pagesCover 2 or 4)
  if (pt === "BROCHURE" && isDosCarre && pagesCover === 0)
    errors.push("Dos carré collé : indiquez une couverture (2 ou 4 pages)");
  // 7. Dos carré requires cover grammage ≥ 170g
  if (pt === "BROCHURE" && isDosCarre && pagesCover > 0) {
    const covG = data.paperCoverGrammage ?? 0;
    if (covG > 0 && covG < 170) errors.push("Dos carré collé : grammage couverture ≥ 170 g requis");
  }

  // 8. Pages intérieur ≥ 4 and multiple of 4 — handled by isPagesValid
  // 9. Pages couverture must be 0, 2, or 4
  if (pagesCover !== 0 && pagesCover !== 2 && pagesCover !== 4)
    errors.push("Pages couverture : 0, 2 ou 4");

  // 10. Total pages multiple of 4
  if (totalPages > 0 && totalPages % 4 !== 0) errors.push("Total des pages (intérieur + couverture) doit être multiple de 4");

  // 11. Folder Validation based on physical constraints (Group C)
  if (pt === "DEPLIANT" || pt === "FLYER" && data.foldCount > 0) {
    const internalGrammage = data.paperInteriorGrammage ?? 0;
    const coverGrammage = data.paperCoverGrammage ?? internalGrammage;
    const maxCheckedGrammage = Math.max(internalGrammage, coverGrammage);
    
    // Check primary fold
    const primaryRes = validateFoldGrammage(data.foldTypeName ?? "", data.foldCount, maxCheckedGrammage);
    if (!primaryRes.valid) {
      if (primaryRes.reason) errors.push(primaryRes.reason);
    } else if (primaryRes.maxGrammage !== null && maxCheckedGrammage > primaryRes.maxGrammage) {
      errors.push(`${data.foldTypeName} : grammage max ${primaryRes.maxGrammage} g`);
    }

    // Check secondary fold if present
    if (data.secondaryFoldType && data.secondaryFoldCount > 0) {
      const secondaryRes = validateFoldGrammage(data.secondaryFoldType, data.secondaryFoldCount, maxCheckedGrammage);
      if (!secondaryRes.valid) {
        if (secondaryRes.reason) errors.push(secondaryRes.reason);
      } else if (secondaryRes.maxGrammage !== null && maxCheckedGrammage > secondaryRes.maxGrammage) {
        errors.push(`${data.secondaryFoldType} : grammage max ${secondaryRes.maxGrammage} g`);
      }
    }
  }

  // 15. Open format max 32×48 cm for depliants
  if (pt === "DEPLIANT" || pt === "FLYER") {
    const ow = data.openFormat?.widthCm ?? 0;
    const oh = data.openFormat?.heightCm ?? 0;
    const maxDim = 48;
    if (ow > maxDim || oh > maxDim) errors.push("Format ouvert dépliant/flyer : max 32×48 cm");
  }

  return errors;
}

/** Stub for binding name from id (validation runs client-side without API). We use generic page rules. */
function getBindingNameForValidation(_bindingId: string | null): string | null {
  return null; // min 4, no max in validation when unknown
}

export function validateStep(step: WizardStep, data: QuoteInput): StepValidationResult {
  const missing: string[] = [];

  switch (step) {
    case 1:
      // Step 1: product type chosen by clicking a card; no "Next" button
      return { valid: true };

    case 2: {
      if (!data.quantity || data.quantity < 1) missing.push("Quantité");
      if (!data.format) missing.push("Format");
      else if (data.format.name === "Personnalise" && (data.format.widthCm <= 0 || data.format.heightCm <= 0))
        missing.push("Dimensions personnalisées (largeur et hauteur)");
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 3: {
      if (!data.bindingTypeId) missing.push("Type de reliure");
      const bindingName = getBindingNameForValidation(data.bindingTypeId) ?? data.bindingTypeName;
      if (
        data.pagesInterior == null ||
        !isPagesValid(data.pagesInterior, bindingName)
      ) {
        missing.push("Pages intérieures (multiple de 4, min. 4)");
      }
      const ruleErrors = validateQuoteRules(data);
      if (ruleErrors.length) missing.push(...ruleErrors);
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 4: {
      // Couverture: paper (cover or single), colors (cover or single), folds (dépliant), lamination
      const pagesCover = data.pagesCover ?? 4;
      const hasCoverPages = canHaveCover(data.productType) && pagesCover > 0;
      if (hasCoverPages) {
        if (!data.paperCoverTypeId) missing.push("Papier couverture — type");
        if (data.paperCoverGrammage == null || data.paperCoverGrammage <= 0)
          missing.push("Papier couverture — grammage");
        if (!data.colorModeCoverId) missing.push("Couleurs couverture");
      } else if (!canHaveCover(data.productType)) {
        if (!data.paperInteriorTypeId) missing.push("Papier — type");
        if (data.paperInteriorGrammage == null || data.paperInteriorGrammage <= 0)
          missing.push("Papier — grammage");
        if (!data.colorModeInteriorId && !data.colorModeCoverId) missing.push("Mode couleur");
      }
      if (canHaveFolds(data.productType) && !data.foldTypeId) missing.push("Pliage");
      if (data.laminationMode !== "Rien" && !data.laminationFinishId)
        missing.push("Finition pelliculage");
      missing.push(...validateQuoteRules(data));
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 5: {
      // Intérieur (brochure only): paper interior, colors interior
      if (!canHaveInterior(data.productType)) return { valid: true };
      if (!data.paperInteriorTypeId) missing.push("Papier intérieur — type");
      if (data.paperInteriorGrammage == null || data.paperInteriorGrammage <= 0)
        missing.push("Papier intérieur — grammage");
      if (!data.colorModeInteriorId) missing.push("Couleurs intérieur");
      missing.push(...validateQuoteRules(data));
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 6: {
      const hasValidPoint = data.deliveryPoints.some(
        (p) => (p.departmentCode?.trim() || p.departmentName?.trim()) && p.copies > 0
      );
      if (!hasValidPoint)
        missing.push("Au moins un point de livraison avec département et quantité > 0");
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 7:
      return { valid: true };

    default:
      return { valid: true };
  }
}
