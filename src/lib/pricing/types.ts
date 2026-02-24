// Product types enum (matches Prisma schema)
export type ProductType = "BROCHURE" | "DEPLIANT" | "FLYER" | "CARTE_DE_VISITE";

export interface QuoteFormat {
  name: string;
  widthCm: number;
  heightCm: number;
}

export interface QuoteDeliveryPoint {
  copies: number;
  departmentCode: string;
  departmentName: string;
  zone: number;
  hayon: boolean;
  weightKg?: number;
  price?: number;
}

export interface QuotePackaging {
  cartons: boolean;
  film: boolean;
  elastiques: boolean;
  crystalBoxQty: number;
}

export interface QuoteInput {
  // Step 1
  productType: ProductType | null;
  // Step 2
  quantity: number;
  format: QuoteFormat | null;
  openFormat: { widthCm: number; heightCm: number } | null;
  // Step 3 (brochures only)
  pagesInterior: number | null;
  pagesCover: number; // 0 = pas de couverture, 2 = recto seul, 4 = recto verso (brochures)
  flapSizeCm: number; // 0 = no flaps
  // Step 4
  paperInteriorTypeId: string | null;
  paperInteriorGrammage: number | null;
  paperCoverTypeId: string | null;
  paperCoverGrammage: number | null;
  paperInteriorTypeName: string | null;
  paperCoverTypeName: string | null;
  // Step 5 (display names for preview / save)
  colorModeInteriorId: string | null;
  colorModeCoverId: string | null;
  colorModeInteriorName: string | null;
  colorModeCoverName: string | null;
  rectoVerso: boolean;
  // Step 6
  bindingTypeId: string | null;
  bindingTypeName: string | null;
  foldTypeId: string | null;
  foldTypeName: string | null;
  foldCount: number;
  secondaryFoldType: "Pli Croise" | null;
  secondaryFoldCount: number;
  laminationMode: "Rien" | "Pelliculage Recto" | "Pelliculage Recto Verso";
  laminationFinishId: string | null;
  laminationFinishName: string | null;
  // Step 7
  packaging: QuotePackaging;
  deliveryPoints: QuoteDeliveryPoint[];
  // Meta
  clientName: string;
  projectName: string;
  notes: string;
}

export const EMPTY_QUOTE_INPUT: QuoteInput = {
  productType: null,
  quantity: 0,
  format: null,
  openFormat: null,
  pagesInterior: null,
  pagesCover: 0,
  flapSizeCm: 0,
  paperInteriorTypeId: null,
  paperInteriorGrammage: null,
  paperCoverTypeId: null,
  paperCoverGrammage: null,
  paperInteriorTypeName: null,
  paperCoverTypeName: null,
  colorModeInteriorId: null,
  colorModeCoverId: null,
  colorModeInteriorName: null,
  colorModeCoverName: null,
  rectoVerso: true,
  bindingTypeId: null,
  bindingTypeName: null,
  foldTypeId: null,
  foldTypeName: null,
  foldCount: 1,
  secondaryFoldType: null,
  secondaryFoldCount: 0,
  laminationMode: "Rien",
  laminationFinishId: null,
  laminationFinishName: null,
  packaging: { cartons: false, film: false, elastiques: false, crystalBoxQty: 0 },
  deliveryPoints: [{ copies: 0, departmentCode: "", departmentName: "", zone: 0, hayon: false }],
  clientName: "",
  projectName: "",
  notes: "",
};

// Wizard step numbers (1-indexed); 4=Couverture, 5=Intérieur (merged from old Papier/Couleurs/Finitions)
export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface WizardState {
  currentStep: WizardStep;
  data: QuoteInput;
  completedSteps: Set<WizardStep>;
  isCalculating: boolean;
}
