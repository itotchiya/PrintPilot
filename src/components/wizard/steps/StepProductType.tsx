"use client";
import { cn } from "@/lib/utils";
import { BookOpen, FoldVertical, FileImage, CreditCard } from "lucide-react";
import type { StepProps } from "../WizardContainer";
import type { ProductType } from "@/lib/pricing/types";

const PRODUCTS: {
  type: ProductType;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    type: "BROCHURE",
    label: "Brochure",
    description: "Livret multi-pages avec couverture et pages intérieures",
    icon: BookOpen,
  },
  {
    type: "DEPLIANT",
    label: "Dépliant",
    description: "Feuille unique pliée (1 à 6 plis)",
    icon: FoldVertical,
  },
  {
    type: "FLYER",
    label: "Flyer / Poster",
    description: "Feuille plate sans pliage",
    icon: FileImage,
  },
  {
    type: "CARTE_DE_VISITE",
    label: "Carte de visite",
    description: "Carte au format 8,5 × 5,5 cm",
    icon: CreditCard,
  },
];

export function StepProductType({ data, updateData, onNext }: StepProps) {
  function handleSelect(type: ProductType) {
    updateData({
      productType: type,
      pagesInterior: type === "BROCHURE" ? 8 : null,
      pagesCover: type === "BROCHURE" ? 4 : 0,
      bindingTypeId: null,
      foldTypeId: null,
      foldCount: 1,
      secondaryFoldType: null,
      secondaryFoldCount: 0,
      format: null,
      openFormat: null,
    });
    onNext();
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Quel type de produit ?</h2>
        <p className="text-sm text-muted-foreground">
          Sélectionnez le produit pour commencer votre devis
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {PRODUCTS.map(({ type, label, description, icon: Icon }) => (
          <button
            key={type}
            type="button"
            onClick={() => handleSelect(type)}
            className={cn(
              "group relative flex flex-col gap-3 rounded-xl border-2 p-5 text-left transition-all",
              "hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              data.productType === type
                ? "border-primary bg-primary/5"
                : "border-border bg-card",
            )}
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg transition-colors",
                data.productType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-primary",
              )}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{label}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
