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

export function StepQuantityFormat({ data, updateData }: StepProps) {
  const [formats, setFormats] = useState<FormatPreset[]>([]);
  const [customW, setCustomW] = useState(String(data.format?.widthCm ?? ""));
  const [customH, setCustomH] = useState(String(data.format?.heightCm ?? ""));

  useEffect(() => {
    fetch("/api/admin/config/formats")
      .then((r) => r.json())
      .then((all: FormatPreset[]) => {
        const filtered = all.filter(
          (f) =>
            f.active &&
            (data.productType ? f.productTypes.includes(data.productType) : true),
        );
        setFormats(filtered);
      })
      .catch(() => {});
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
          <Select value={data.format?.name ?? ""} onValueChange={handleFormatChange}>
            <SelectTrigger>
              <SelectValue placeholder="Choisir un format…" />
            </SelectTrigger>
            <SelectContent>
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
