"use client";

import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { canHaveInterior } from "@/lib/pricing/product-rules";
import type { StepProps } from "../WizardContainer";

interface PaperGrammage {
  id: string;
  grammage: number;
  pricePerKg: number;
  active: boolean;
}

interface PaperType {
  id: string;
  name: string;
  category: string;
  active: boolean;
  grammages: PaperGrammage[];
}

interface ColorMode {
  id: string;
  name: string;
  platesPerSide: number;
  hasVarnish: boolean;
  active: boolean;
}

export function StepInterior({ data, updateData }: StepProps) {
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([]);
  const [colorModes, setColorModes] = useState<ColorMode[]>([]);

  useEffect(() => {
    fetch("/api/admin/config/paper")
      .then((r) => r.json())
      .then(setPaperTypes)
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/admin/config/colors")
      .then((r) => r.json())
      .then((all: ColorMode[]) => setColorModes(all.filter((c) => c.active)))
      .catch(() => {});
  }, []);

  const showInterior = canHaveInterior(data.productType);
  if (!showInterior) return null;

  const filteredTypes = paperTypes.filter(
    (p) =>
      p.active &&
      (p.category === "INTERIOR" || p.category === "BOTH")
  );
  const selectedType = filteredTypes.find(
    (p) => p.id === data.paperInteriorTypeId
  );
  const grammages =
    selectedType?.grammages
      .filter((g) => g.active)
      .sort((a, b) => a.grammage - b.grammage) ?? [];

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Elements 2</h2>
        <p className="text-sm text-muted-foreground">
          Papier et couleurs pour les pages intérieures
        </p>
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Papier intérieur *
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Type de papier</Label>
            <Select
              value={data.paperInteriorTypeId ?? ""}
              onValueChange={(id) => {
                const pt = filteredTypes.find((p) => p.id === id);
                updateData({
                  paperInteriorTypeId: id,
                  paperInteriorGrammage: null,
                  paperInteriorTypeName: pt?.name ?? null,
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir le papier…" />
              </SelectTrigger>
              <SelectContent>
                {filteredTypes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Grammage (g/m²)</Label>
            <Select
              value={
                data.paperInteriorGrammage
                  ? String(data.paperInteriorGrammage)
                  : ""
              }
              onValueChange={(v) =>
                updateData({ paperInteriorGrammage: Number(v) })
              }
              disabled={!data.paperInteriorTypeId || grammages.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Choisir le grammage…" />
              </SelectTrigger>
              <SelectContent>
                {grammages.map((g) => (
                  <SelectItem key={g.id} value={String(g.grammage)}>
                    {g.grammage} g/m²
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Couleurs — Intérieur *</Label>
        <Select
          value={data.colorModeInteriorId ?? ""}
          onValueChange={(v) => {
            const mode = colorModes.find((c) => c.id === v);
            updateData({
              colorModeInteriorId: v,
              colorModeInteriorName: mode?.name ?? null,
            });
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Choisir le mode couleur…" />
          </SelectTrigger>
          <SelectContent>
            {colorModes.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
