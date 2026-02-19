import type { QuoteInput, WizardStep } from "./types";
import {
  canHaveCover,
  canHaveInterior,
  canHaveBinding,
  canHaveFolds,
  isPagesValid,
} from "./product-rules";

export interface StepValidationResult {
  valid: boolean;
  missing?: string[];
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
      const bindingName = getBindingNameForValidation(data.bindingTypeId);
      if (
        data.pagesInterior == null ||
        !isPagesValid(data.pagesInterior, bindingName)
      ) {
        missing.push("Pages intérieures (multiple de 4, min. 4)");
      }
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 4: {
      if (canHaveInterior(data.productType)) {
        if (!data.paperInteriorTypeId) missing.push("Papier intérieur — type");
        if (data.paperInteriorGrammage == null || data.paperInteriorGrammage <= 0)
          missing.push("Papier intérieur — grammage");
      }
      if (canHaveCover(data.productType)) {
        if (!data.paperCoverTypeId) missing.push("Papier couverture — type");
        if (data.paperCoverGrammage == null || data.paperCoverGrammage <= 0)
          missing.push("Papier couverture — grammage");
      }
      // Non-brochure: only "body" paper (interior is used as main)
      if (!canHaveInterior(data.productType) && !canHaveCover(data.productType)) {
        if (!data.paperInteriorTypeId) missing.push("Papier — type");
        if (data.paperInteriorGrammage == null || data.paperInteriorGrammage <= 0)
          missing.push("Papier — grammage");
      }
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 5: {
      if (canHaveCover(data.productType) && !data.colorModeCoverId)
        missing.push("Couleurs couverture");
      if (canHaveInterior(data.productType) && !data.colorModeInteriorId)
        missing.push("Couleurs intérieur");
      // Flyer/Carte: one color mode (interior is used for recto or both)
      if (!canHaveCover(data.productType) && !canHaveInterior(data.productType)) {
        if (!data.colorModeInteriorId && !data.colorModeCoverId) missing.push("Mode couleur");
      }
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 6: {
      if (canHaveBinding(data.productType) && !data.bindingTypeId) missing.push("Reliure");
      if (canHaveFolds(data.productType) && !data.foldTypeId) missing.push("Pliage");
      if (data.laminationMode !== "Rien" && !data.laminationFinishId)
        missing.push("Finition pelliculage");
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 7: {
      const hasValidPoint = data.deliveryPoints.some(
        (p) => (p.departmentCode?.trim() || p.departmentName?.trim()) && p.copies > 0
      );
      if (!hasValidPoint)
        missing.push("Au moins un point de livraison avec département et quantité > 0");
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 8:
      return { valid: true };

    default:
      return { valid: true };
  }
}
