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
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  canHaveCover,
  canHaveFolds,
  canHaveRectoVerso,
} from "@/lib/pricing/product-rules";
import { blurActiveElement, onWizardSelectTriggerPointerDown } from "../selectBlurFix";
import { FALLBACK_PAPER_TYPES } from "../fallbacks";
import type { PaperType } from "../fallbacks";
import type { StepProps } from "../WizardContainer";



interface ColorMode {
  id: string;
  name: string;
  platesPerSide: number;
  hasVarnish: boolean;
  active: boolean;
}

interface FoldType {
  id: string;
  name: string;
  maxFolds: number;
  canBeSecondary: boolean;
  active: boolean;
}

interface LaminationFinish {
  id: string;
  name: string;
  active: boolean;
}

const LAMINATION_MODES = [
  "Rien",
  "Pelliculage Recto",
  "Pelliculage Recto Verso",
] as const;
const FALLBACK_COLOR_MODES: ColorMode[] = [
  { id: "fb-c-1", name: "Quadrichromie", platesPerSide: 4, hasVarnish: false, active: true },
  { id: "fb-c-2", name: "Quadrichromie + Vernis Machine", platesPerSide: 5, hasVarnish: true, active: true },
  { id: "fb-c-3", name: "Bichromie", platesPerSide: 2, hasVarnish: false, active: true },
  { id: "fb-c-4", name: "Noir", platesPerSide: 1, hasVarnish: false, active: true },
];
const FALLBACK_FOLD_TYPES: FoldType[] = [
  { id: "fb-f-1", name: "Pli Roule", maxFolds: 6, canBeSecondary: false, active: true },
  { id: "fb-f-2", name: "Pli Accordeon", maxFolds: 6, canBeSecondary: false, active: true },
  { id: "fb-f-3", name: "Pli Croise", maxFolds: 6, canBeSecondary: true, active: true },
];
const FALLBACK_LAMINATION_FINISHES: LaminationFinish[] = [
  { id: "fb-l-1", name: "Brillant", active: true },
  { id: "fb-l-2", name: "Mat", active: true },
  { id: "fb-l-3", name: "Soft Touch", active: true },
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

function parseFoldTypes(raw: unknown): FoldType[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((f: Record<string, unknown>) => ({
    id: String(f.id ?? ""),
    name: String(f.name ?? ""),
    maxFolds: Number(f.maxFolds) ?? 6,
    canBeSecondary: f.canBeSecondary === true,
    active: f.active !== false,
  })).filter((x) => x.id && x.name);
}

function parseLaminationFinishes(raw: unknown): LaminationFinish[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((l: Record<string, unknown>) => ({
    id: String(l.id ?? ""),
    name: String(l.name ?? ""),
    active: l.active !== false,
  })).filter((x) => x.id && x.name);
}

function PaperSelector({
  label,
  required,
  paperTypes,
  selectedTypeId,
  selectedGrammage,
  onTypeChange,
  onGrammageChange,
  filterCategory,
}: {
  label: string;
  required?: boolean;
  paperTypes: PaperType[];
  selectedTypeId: string | null;
  selectedGrammage: number | null;
  onTypeChange: (id: string) => void;
  onGrammageChange: (g: number) => void;
  filterCategory?: "INTERIOR" | "COVER";
}) {
  const filteredTypes = paperTypes.filter(
    (p) =>
      p.active &&
      (!filterCategory || p.category === filterCategory || p.category === "BOTH")
  );
  const selectedType = filteredTypes.find((p) => p.id === selectedTypeId);
  const grammages =
    selectedType?.grammages
      .filter((g) => g.active)
      .sort((a, b) => a.grammage - b.grammage) ?? [];

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">
        {label}
        {required && " *"}
      </h3>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Type de papier</Label>
          <Select value={selectedTypeId ?? ""} onValueChange={onTypeChange} onOpenChange={(open) => open && blurActiveElement()}>
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
            value={selectedGrammage ? String(selectedGrammage) : ""}
            onValueChange={(v) => onGrammageChange(Number(v))}
            disabled={!selectedTypeId || grammages.length === 0}
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
  );
}

export function StepCouverture({ data, updateData }: StepProps) {
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([]);
  const [colorModes, setColorModes] = useState<ColorMode[]>([]);
  const [foldTypes, setFoldTypes] = useState<FoldType[]>([]);
  const [laminationFinishes, setLaminationFinishes] = useState<LaminationFinish[]>([]);

  const isBrochure = canHaveCover(data.productType);
  const showFolds = canHaveFolds(data.productType);
  const showRectoVerso = canHaveRectoVerso(data.productType);
  const showLaminationFinish = data.laminationMode !== "Rien";

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

  useEffect(() => {
    if (showFolds) {
      fetch("/api/admin/config/folds")
        .then((r) => (r.ok ? r.json() : []))
        .then((raw: unknown) => {
          const list = parseFoldTypes(raw).filter((f) => f.active);
          setFoldTypes(list.length > 0 ? list : FALLBACK_FOLD_TYPES);
        })
        .catch(() => setFoldTypes(FALLBACK_FOLD_TYPES));
    } else {
      setFoldTypes([]);
    }
  }, [showFolds]);

  useEffect(() => {
    if (showLaminationFinish) {
      fetch("/api/admin/config/lamination")
        .then((r) => (r.ok ? r.json() : []))
        .then((raw: unknown) => {
          const list = parseLaminationFinishes(raw).filter((l) => l.active);
          setLaminationFinishes(list.length > 0 ? list : FALLBACK_LAMINATION_FINISHES);
        })
        .catch(() => setLaminationFinishes(FALLBACK_LAMINATION_FINISHES));
    } else {
      setLaminationFinishes([]);
    }
  }, [showLaminationFinish]);

  // FIX: Reactive lamination clearing (Group C limits)
  // - When relevant grammage drops below 170g, lamination must be "Rien"
  // - If product is DEPLIANT, lamination must be "Rien"
  const relevantGrammage = isBrochure
    ? data.paperCoverGrammage ?? null
    : data.paperInteriorGrammage ?? null;

  useEffect(() => {
    const isThinPaper = relevantGrammage != null && relevantGrammage < 170;
    const isDepliant = data.productType === "DEPLIANT";

    if ((isThinPaper || isDepliant) && data.laminationMode !== "Rien") {
      updateData({
        laminationMode: "Rien",
        laminationFinishId: null,
        laminationFinishName: null,
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relevantGrammage, data.productType]);

  const secondaryEnabled = data.secondaryFoldType === "Pli Croise";
  const pagesCover = data.pagesCover ?? 4;
  const showCoverFields = isBrochure && pagesCover > 0;

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Elements 1</h2>
        <p className="text-sm text-muted-foreground">
          Papier, couleurs et finitions pour la couverture
          {!isBrochure && " du produit"}
        </p>
      </div>

      {showCoverFields ? (
        <PaperSelector
          label="Papier couverture"
          required
          paperTypes={paperTypes}
          selectedTypeId={data.paperCoverTypeId}
          selectedGrammage={data.paperCoverGrammage}
          onTypeChange={(id) => {
            const pt = paperTypes.find((p) => p.id === id);
            updateData({
              paperCoverTypeId: id,
              paperCoverGrammage: null,
              paperCoverTypeName: pt?.name ?? null,
            });
          }}
          onGrammageChange={(g) => updateData({ paperCoverGrammage: g })}
          filterCategory="COVER"
        />
      ) : isBrochure && pagesCover === 0 ? (
        <p className="text-sm text-muted-foreground rounded-md border bg-muted/50 px-3 py-2">
          Pas de couverture (0 page) — pas de papier ni couleurs couverture.
        </p>
      ) : (
        <PaperSelector
          label="Papier"
          required
          paperTypes={paperTypes}
          selectedTypeId={data.paperInteriorTypeId}
          selectedGrammage={data.paperInteriorGrammage}
          onTypeChange={(id) => {
            const pt = paperTypes.find((p) => p.id === id);
            updateData({
              paperInteriorTypeId: id,
              paperInteriorGrammage: null,
              paperInteriorTypeName: pt?.name ?? null,
            });
          }}
          onGrammageChange={(g) => updateData({ paperInteriorGrammage: g })}
        />
      )}

      {(showCoverFields || !isBrochure) && (
        <>
          <Separator />
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-foreground">
              Couleurs d&apos;impression {showCoverFields ? "— Couverture" : ""} *
            </h3>
            <Select
              value={
                showCoverFields
                  ? data.colorModeCoverId ?? ""
                  : data.colorModeInteriorId ?? ""
              }
              onValueChange={(v) => {
                const mode = colorModes.find((c) => c.id === v);
                const name = mode?.name ?? null;
                if (showCoverFields) {
                  updateData({ colorModeCoverId: v, colorModeCoverName: name });
                } else {
                  updateData({ colorModeInteriorId: v, colorModeInteriorName: name });
                }
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
        </>
      )}

      {showRectoVerso && (
        <>
          <Separator />
          <div className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Recto-Verso</Label>
              <p className="text-xs text-muted-foreground">
                Impression sur les deux faces
              </p>
            </div>
            <Switch
              checked={data.rectoVerso}
              onCheckedChange={(v) => updateData({ rectoVerso: v })}
            />
          </div>
        </>
      )}

      {showFolds && (
        <>
          <Separator />
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">Pliage *</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type de pli</Label>
                <Select
                  value={data.foldTypeId ?? ""}
                  onValueChange={(v) => {
                    const f = foldTypes.find((x) => x.id === v);
                    updateData({
                      foldTypeId: v,
                      foldTypeName: f?.name ?? null,
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir le pli…" />
                  </SelectTrigger>
                  <SelectContent>
                    {foldTypes
                      .filter((f) => f.active)
                      .map((f) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Nombre de plis (principal)</Label>
                <Select
                  value={String(data.foldCount)}
                  onValueChange={(v) => updateData({ foldCount: Number(v) })}
                  onOpenChange={(open) => open && blurActiveElement()}
                >
                  <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper" sideOffset={4} className="z-[100]">
                    {[1, 2, 3, 4, 5, 6].map((n) => (
                      <SelectItem key={n} value={String(n)}>
                        {n}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between py-1">
                <div>
                  <Label
                    htmlFor="secondaryFold"
                    className="text-sm font-medium cursor-pointer"
                  >
                    Pli croisé (secondaire)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Ajouter un pli perpendiculaire
                  </p>
                </div>
                <Switch
                  id="secondaryFold"
                  checked={secondaryEnabled}
                  onCheckedChange={(checked) =>
                    updateData({
                      secondaryFoldType: checked ? "Pli Croise" : null,
                      secondaryFoldCount: checked ? 1 : 0,
                    })
                  }
                />
              </div>
              {secondaryEnabled && (
                <div className="space-y-2 pl-4 border-l-2 border-muted">
                  <Label htmlFor="secondaryFoldCount">
                    Nombre de plis croisés
                  </Label>
                  <Input
                    id="secondaryFoldCount"
                    type="number"
                    min={1}
                    max={5}
                    value={data.secondaryFoldCount}
                    onChange={(e) =>
                      updateData({
                        secondaryFoldCount: Math.min(
                          5,
                          Math.max(1, Number(e.target.value))
                        ),
                      })
                    }
                    className="w-32"
                  />
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Separator />

      {data.productType !== "DEPLIANT" && (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-foreground">Pelliculage</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
            <Label>Mode de pelliculage</Label>
            <Select
              value={data.laminationMode}
              onValueChange={(v) =>
                updateData({
                  laminationMode: v as typeof data.laminationMode,
                  laminationFinishId: v === "Rien" ? null : data.laminationFinishId,
                  laminationFinishName: v === "Rien" ? null : data.laminationFinishName,
                })
              }
              onOpenChange={(open) => open && blurActiveElement()}
            >
              <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent position="popper" sideOffset={4} className="z-[100]">
                {LAMINATION_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {showLaminationFinish && (
            <div className="space-y-2">
              <Label>Finition</Label>
              <Select
                value={data.laminationFinishId ?? ""}
                onValueChange={(v) => {
                  const f = laminationFinishes.find((x) => x.id === v);
                  updateData({
                    laminationFinishId: v,
                    laminationFinishName: f?.name ?? null,
                  });
                }}
                onOpenChange={(open) => open && blurActiveElement()}
              >
                <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
                  <SelectValue placeholder="Choisir la finition…" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4} className="z-[100]">
                  {laminationFinishes
                    .filter((f) => f.active)
                    .map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
