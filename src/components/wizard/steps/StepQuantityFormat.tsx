"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { calcOpenFormat, isBrochure, isDepliant } from "@/lib/pricing/product-rules";
import { blurActiveElement, onWizardSelectTriggerPointerDown } from "../selectBlurFix";
import type { StepProps } from "../WizardContainer";

interface FormatPreset {
  id: string;
  name: string;
  widthCm: number;
  heightCm: number;
  orientation: string;
  productTypes: string[];
  active: boolean;
}

/** Fallback formats when API fails or returns empty (e.g. before seed). */
const FALLBACK_FORMATS: FormatPreset[] = [
  { id: "fallback-a4", name: "A4 Francaise", widthCm: 21, heightCm: 29.7, orientation: "PORTRAIT", productTypes: ["BROCHURE", "DEPLIANT", "FLYER"], active: true },
  { id: "fallback-a5", name: "A5 Francaise", widthCm: 14.8, heightCm: 21, orientation: "PORTRAIT", productTypes: ["BROCHURE", "DEPLIANT", "FLYER"], active: true },
  { id: "fallback-21x21", name: "Carre 21x21", widthCm: 21, heightCm: 21, orientation: "SQUARE", productTypes: ["BROCHURE", "DEPLIANT", "FLYER"], active: true },
  { id: "fallback-carte", name: "Carte de visite", widthCm: 8.5, heightCm: 5.5, orientation: "LANDSCAPE", productTypes: ["CARTE_DE_VISITE"], active: true },
  { id: "fallback-personnalise", name: "Personnalise", widthCm: 0, heightCm: 0, orientation: "PORTRAIT", productTypes: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"], active: true },
];

function normalizeProductTypes(pt: unknown): string[] {
  if (Array.isArray(pt)) return pt.filter((x): x is string => typeof x === "string");
  return [];
}

export function StepQuantityFormat({ data, updateData }: StepProps) {
  const [formats, setFormats] = useState<FormatPreset[]>([]);
  const [customW, setCustomW] = useState(String(data.format?.widthCm ?? ""));
  const [customH, setCustomH] = useState(String(data.format?.heightCm ?? ""));
  useEffect(() => {
    fetch("/api/admin/config/formats")
      .then((r) => {
        if (!r.ok) return [];
        return r.json();
      })
      .then((all: unknown) => {
        if (!Array.isArray(all)) return;
        const productType = data.productType ?? null;
        const filtered = all.filter((f: { active?: boolean; productTypes?: unknown }) => {
          const active = f.active !== false;
          const types = normalizeProductTypes(f.productTypes);
          const matchesProduct = !productType || types.length === 0 || types.includes(productType);
          return active && matchesProduct;
        }).map((f: Record<string, unknown>) => ({
          id: String(f.id ?? f.name),
          name: String(f.name ?? ""),
          widthCm: Number(f.widthCm) || 0,
          heightCm: Number(f.heightCm) || 0,
          orientation: String(f.orientation ?? "PORTRAIT"),
          productTypes: normalizeProductTypes(f.productTypes),
          active: f.active !== false,
        })) as FormatPreset[];
        const list = filtered.length > 0 ? filtered : (
          data.productType
            ? FALLBACK_FORMATS.filter((f) => f.productTypes.includes(data.productType!))
            : FALLBACK_FORMATS
        );
        setFormats(list.length > 0 ? list : FALLBACK_FORMATS);
      })
      .catch(() => {
        const list = data.productType
          ? FALLBACK_FORMATS.filter((f) => f.productTypes.includes(data.productType!))
          : FALLBACK_FORMATS;
        setFormats(list.length > 0 ? list : FALLBACK_FORMATS);
      });
  }, [data.productType]);

  function handleFormatChange(formatName: string) {
    const preset = formats.find((f) => f.name === formatName);
    if (!preset) return;
    if (preset.name === "Personnalise") {
      updateData({ format: { name: "Personnalise", widthCm: 0, heightCm: 0 }, openFormat: null });
      return;
    }
    const open = calcOpenFormat(
      preset.widthCm,
      preset.heightCm,
      data.productType,
      data.foldCount,
      data.secondaryFoldType,
      data.secondaryFoldCount,
    );
    updateData({
      format: { name: preset.name, widthCm: preset.widthCm, heightCm: preset.heightCm },
      openFormat: open,
    });
  }

  function handleCustomDimChange() {
    const w = parseFloat(customW);
    const h = parseFloat(customH);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return;
    const open = calcOpenFormat(
      w,
      h,
      data.productType,
      data.foldCount,
      data.secondaryFoldType,
      data.secondaryFoldCount,
    );
    updateData({ format: { name: "Personnalise", widthCm: w, heightCm: h }, openFormat: open });
  }

  const isCustom = data.format?.name === "Personnalise";
  const hasFolds = isDepliant(data.productType);
  const showOpenFormat = data.openFormat && (isBrochure(data.productType) || hasFolds);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Quantité et format</h2>
        <p className="text-sm text-muted-foreground">
          Définissez la quantité et les dimensions du produit
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Quantity */}
        <div className="space-y-2">
          <Label htmlFor="quantity">Quantité *</Label>
          <Input
            id="quantity"
            type="number"
            min={1}
            placeholder="ex : 500"
            value={data.quantity || ""}
            onChange={(e) => updateData({ quantity: parseInt(e.target.value) || 0 })}
          />
        </div>

        {/* Format */}
        <div className="space-y-2">
          <Label>Format *</Label>
          <Select
            value={data.format?.name ?? ""}
            onValueChange={handleFormatChange}
            onOpenChange={(open) => open && blurActiveElement()}
          >
            <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
              <SelectValue placeholder="Choisir un format…" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="z-[100]">
              {formats.map((f) => (
                <SelectItem key={f.id} value={f.name}>
                  {f.name !== "Personnalise" ? `${f.name} (${f.widthCm} × ${f.heightCm} cm)` : f.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Custom dimensions */}
      {isCustom && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="customW">Largeur (cm) *</Label>
            <Input
              id="customW"
              type="number"
              step="0.1"
              min="1"
              value={customW}
              onChange={(e) => setCustomW(e.target.value)}
              onBlur={handleCustomDimChange}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="customH">Hauteur (cm) *</Label>
            <Input
              id="customH"
              type="number"
              step="0.1"
              min="1"
              value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              onBlur={handleCustomDimChange}
            />
          </div>
        </div>
      )}

      {/* Open format display */}
      {showOpenFormat && data.openFormat && (
        <div className="rounded-xl border bg-muted/50 px-4 py-3">
          <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Format ouvert (calculé)
          </p>
          <p className="text-sm font-semibold text-foreground">
            {data.openFormat.widthCm} × {data.openFormat.heightCm} cm
          </p>
        </div>
      )}
    </div>
  );
}
