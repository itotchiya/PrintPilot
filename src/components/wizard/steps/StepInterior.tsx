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
import { blurActiveElement, onWizardSelectTriggerPointerDown } from "../selectBlurFix";
import { FALLBACK_PAPER_TYPES } from "../fallbacks";
import type { PaperType } from "../fallbacks";
import type { StepProps } from "../WizardContainer";

interface PaperGrammage {
  id: string;
  grammage: number;
  pricePerKg: number;
  active: boolean;
}

interface ColorMode {
  id: string;
  name: string;
  platesPerSide: number;
  hasVarnish: boolean;
  active: boolean;
}
const FALLBACK_COLOR_MODES: ColorMode[] = [
  { id: "fb-c-1", name: "Quadrichromie", platesPerSide: 4, hasVarnish: false, active: true },
  { id: "fb-c-2", name: "Quadrichromie + Vernis Machine", platesPerSide: 5, hasVarnish: true, active: true },
  { id: "fb-c-3", name: "Bichromie", platesPerSide: 2, hasVarnish: false, active: true },
  { id: "fb-c-4", name: "Noir", platesPerSide: 1, hasVarnish: false, active: true },
];

function parsePaperTypes(raw: unknown): PaperType[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((p: Record<string, unknown>) => ({
    id: String(p.id ?? ""),
    name: String(p.name ?? ""),
    category: String(p.category ?? "BOTH"),
    active: p.active !== false,
    grammages: Array.isArray(p.grammages)
      ? (p.grammages as Record<string, unknown>[]).map((g: Record<string, unknown>) => ({
          id: String(g.id ?? ""),
          grammage: Number(g.grammage) || 0,
          pricePerKg: Number(g.pricePerKg) || 0,
          active: g.active !== false,
        }))
      : [],
  })).filter((p) => p.id && p.name);
}

function parseColorModes(raw: unknown): ColorMode[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((c: Record<string, unknown>) => ({
    id: String(c.id ?? ""),
    name: String(c.name ?? ""),
    platesPerSide: Number(c.platesPerSide) || 4,
    hasVarnish: c.hasVarnish === true,
    active: c.active !== false,
  })).filter((x) => x.id && x.name);
}

export function StepInterior({ data, updateData }: StepProps) {
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([]);
  const [colorModes, setColorModes] = useState<ColorMode[]>([]);

  useEffect(() => {
    fetch("/api/admin/config/paper")
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: unknown) => {
        const list = parsePaperTypes(raw);
        setPaperTypes(list.length > 0 ? list : FALLBACK_PAPER_TYPES);
      })
      .catch(() => setPaperTypes(FALLBACK_PAPER_TYPES));
  }, []);

  useEffect(() => {
    fetch("/api/admin/config/colors")
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: unknown) => {
        const list = parseColorModes(raw).filter((c) => c.active);
        setColorModes(list.length > 0 ? list : FALLBACK_COLOR_MODES);
      })
      .catch(() => setColorModes(FALLBACK_COLOR_MODES));
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
              onOpenChange={(open) => open && blurActiveElement()}
            >
              <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
                <SelectValue placeholder="Choisir le papier…" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[100]">
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
              onOpenChange={(open) => open && blurActiveElement()}
            >
              <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
                <SelectValue placeholder="Choisir le grammage…" />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[100]">
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
          onOpenChange={(open) => open && blurActiveElement()}
        >
          <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
            <SelectValue placeholder="Choisir le mode couleur…" />
          </SelectTrigger>
          <SelectContent position="popper" sideOffset={4} className="z-[100]">
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
