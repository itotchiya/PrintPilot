import type { QuoteInput } from "./types";

const N_A = "(n/a)";

function emptyStr(s: string | null | undefined): boolean {
  return s == null || String(s).trim() === "";
}

/**
 * Returns a normalized snapshot of all wizard inputs for console tracking.
 * Optional/unused fields show as null or "(optionnel)" / "(n/a)" so the full process is visible.
 */
export function getWizardTrackingSnapshot(data: QuoteInput): Record<string, unknown> {
  const p = data.productType;

  const snapshot: Record<string, unknown> = {
    // Step 1
    productType: p ?? null,

    // Step 2
    quantity: data.quantity || null,
    format:
      data.format != null
        ? `${data.format.widthCm} × ${data.format.heightCm} cm (${data.format.name})`
        : null,
    openFormat:
      data.openFormat != null && (p === "BROCHURE" || p === "DEPLIANT")
        ? `${data.openFormat.widthCm} × ${data.openFormat.heightCm} cm`
        : N_A,

    // Step 3 (BROCHURE only) — names for console readability
    bindingType:
      p === "BROCHURE"
        ? (data.bindingTypeName ?? data.bindingTypeId ?? null)
        : N_A,
    pagesInterior: p === "BROCHURE" ? (data.pagesInterior ?? null) : N_A,
    pagesCover: p === "BROCHURE" ? (data.pagesCover ?? 0) : N_A,
    flapSizeCm:
      p === "BROCHURE"
        ? data.flapSizeCm != null && data.flapSizeCm > 0
          ? data.flapSizeCm
          : null
        : N_A,

    // Step 4 — Éléments 1 (paper: cover for BROCHURE, interior for others) — names for readability
    paperCoverType:
      p === "BROCHURE"
        ? (data.paperCoverTypeName ?? data.paperCoverTypeId ?? null)
        : N_A,
    paperCoverGrammage: p === "BROCHURE" ? (data.paperCoverGrammage ?? null) : N_A,
    paperInteriorType:
      p === "BROCHURE" ? N_A : (data.paperInteriorTypeName ?? data.paperInteriorTypeId ?? null),
    paperInteriorGrammage:
      p === "BROCHURE" ? N_A : (data.paperInteriorGrammage ?? null),

    colorModeCover: p === "BROCHURE" ? (data.colorModeCoverName ?? data.colorModeCoverId ?? null) : N_A,
    colorModeInterior:
      p !== "BROCHURE" ? (data.colorModeInteriorName ?? data.colorModeInteriorId ?? null) : N_A,

    rectoVerso: p === "BROCHURE" ? N_A : data.rectoVerso,

    foldType:
      p === "DEPLIANT" ? (data.foldTypeName ?? data.foldTypeId ?? null) : N_A,
    foldCount: p === "DEPLIANT" ? data.foldCount : N_A,
    secondaryFoldType:
      p === "DEPLIANT" ? (data.secondaryFoldType ?? null) : N_A,
    secondaryFoldCount: p === "DEPLIANT" ? data.secondaryFoldCount : N_A,

    laminationMode: data.laminationMode ?? "Rien",
    laminationFinish:
      data.laminationMode !== "Rien"
        ? (data.laminationFinishName ?? data.laminationFinishId ?? null)
        : null,

    // Step 5 (BROCHURE only — interior) — names for readability
    paperInteriorType_step5:
      p === "BROCHURE" ? (data.paperInteriorTypeName ?? data.paperInteriorTypeId ?? null) : N_A,
    paperInteriorGrammage_step5: p === "BROCHURE" ? (data.paperInteriorGrammage ?? null) : N_A,
    colorModeInterior_step5:
      p === "BROCHURE" ? (data.colorModeInteriorName ?? data.colorModeInteriorId ?? null) : N_A,

    // Step 6
    packaging_cartons: data.packaging?.cartons ?? false,
    packaging_film: data.packaging?.film ?? false,
    packaging_elastiques: data.packaging?.elastiques ?? false,
    packaging_crystalBoxQty:
      p === "BROCHURE" ? N_A : (data.packaging?.crystalBoxQty ?? 0),

    deliveryPoints_count: data.deliveryPoints?.length ?? 0,
    deliveryPoints: (data.deliveryPoints ?? []).map((pt, i) => ({
      index: i + 1,
      departmentCode: pt.departmentCode || null,
      departmentName: pt.departmentName || null,
      copies: pt.copies,
      zone: pt.zone,
      hayon: pt.hayon,
    })),

    clientName: emptyStr(data.clientName) ? null : data.clientName,
    projectName: emptyStr(data.projectName) ? null : data.projectName,
    notes: emptyStr(data.notes) ? null : data.notes,
  };

  return snapshot;
}

/** Label map for "Entrées du devis" display (same keys as snapshot). */
const ENTREES_LABELS: Record<string, string> = {
  productType: "Type de produit",
  quantity: "Quantité",
  format: "Format (cm)",
  openFormat: "Format à plat (cm)",
  bindingType: "Reliure",
  pagesInterior: "Pages intérieur",
  pagesCover: "Pages couverture",
  flapSizeCm: "Rabat (cm)",
  paperCoverType: "Papier couverture (type)",
  paperCoverGrammage: "Papier couverture (g/m²)",
  paperInteriorType: "Papier (type)",
  paperInteriorGrammage: "Papier (g/m²)",
  colorModeCover: "Couleurs couverture",
  colorModeInterior: "Couleurs",
  rectoVerso: "Recto-verso",
  foldType: "Type de pli",
  foldCount: "Nombre de plis",
  secondaryFoldType: "Pli secondaire",
  secondaryFoldCount: "Plis croisés",
  laminationMode: "Pelliculage",
  laminationFinish: "Finition pelliculage",
  paperInteriorType_step5: "Papier intérieur (type)",
  paperInteriorGrammage_step5: "Papier intérieur (g/m²)",
  colorModeInterior_step5: "Couleurs intérieur",
  packaging_cartons: "Cartons",
  packaging_film: "Film",
  packaging_elastiques: "Élastiques",
  packaging_crystalBoxQty: "Coffrets",
  deliveryPoints_count: "Nb points de livraison",
  deliveryPoints: "Points de livraison",
  clientName: "Client",
  projectName: "Projet",
  notes: "Notes",
};

function formatEntreesValue(v: unknown): string | number {
  if (v == null) return "—";
  if (v === "(n/a)") return "—";
  if (typeof v === "boolean") return v ? "Oui" : "Non";
  if (Array.isArray(v)) {
    if (v.length === 0) return "—";
    return v
      .map(
        (pt: {
          departmentName?: string | null;
          departmentCode?: string | null;
          copies?: number;
          zone?: number;
          hayon?: boolean;
        }) => {
          const name = pt.departmentName || pt.departmentCode || "—";
          const parts = [name, pt.copies != null ? `${pt.copies} ex.` : "", pt.zone ? `Zone ${pt.zone}` : "", pt.hayon ? "Hayon" : ""].filter(Boolean);
          return parts.join(" · ");
        }
      )
      .join(" ; ");
  }
  return v as string | number;
}

export interface EntreesVariable {
  name: string;
  value: string | number;
}

/**
 * Builds the "Entrées du devis" list from wizard data (same source as console snapshot).
 * Only includes fields that apply to the current product type (no n/a rows).
 */
export function getEntreesDevisVariables(data: QuoteInput): EntreesVariable[] {
  const snapshot = getWizardTrackingSnapshot(data);
  const out: EntreesVariable[] = [];
  for (const [key, value] of Object.entries(snapshot)) {
    if (value === "(n/a)") continue;
    if (key === "laminationFinish" && value == null) continue;
    if (
      (key === "clientName" || key === "projectName" || key === "notes") &&
      (value == null || (typeof value === "string" && value.trim() === ""))
    )
      continue;
    const label = ENTREES_LABELS[key] ?? key;
    const display = formatEntreesValue(value);
    out.push({ name: label, value: display });
  }
  return out;
}
