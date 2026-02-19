import type { QuoteInput, WizardStep } from "./types";
import {
  canHaveCover,
  canHaveInterior,
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
      // Couverture: paper (cover or single), colors (cover or single), folds (dépliant), lamination
      if (canHaveCover(data.productType)) {
        if (!data.paperCoverTypeId) missing.push("Papier couverture — type");
        if (data.paperCoverGrammage == null || data.paperCoverGrammage <= 0)
          missing.push("Papier couverture — grammage");
        if (!data.colorModeCoverId) missing.push("Couleurs couverture");
      } else {
        if (!data.paperInteriorTypeId) missing.push("Papier — type");
        if (data.paperInteriorGrammage == null || data.paperInteriorGrammage <= 0)
          missing.push("Papier — grammage");
        if (!data.colorModeInteriorId && !data.colorModeCoverId) missing.push("Mode couleur");
      }
      if (canHaveFolds(data.productType) && !data.foldTypeId) missing.push("Pliage");
      if (data.laminationMode !== "Rien" && !data.laminationFinishId)
        missing.push("Finition pelliculage");
      return { valid: missing.length === 0, missing: missing.length ? missing : undefined };
    }

    case 5: {
      // Intérieur (brochure only): paper interior, colors interior
      if (!canHaveInterior(data.productType)) return { valid: true };
      if (!data.paperInteriorTypeId) missing.push("Papier intérieur — type");
      if (data.paperInteriorGrammage == null || data.paperInteriorGrammage <= 0)
        missing.push("Papier intérieur — grammage");
      if (!data.colorModeInteriorId) missing.push("Couleurs intérieur");
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
