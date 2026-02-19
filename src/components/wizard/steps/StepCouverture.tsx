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
          <Select value={selectedTypeId ?? ""} onValueChange={onTypeChange}>
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
            value={selectedGrammage ? String(selectedGrammage) : ""}
            onValueChange={(v) => onGrammageChange(Number(v))}
            disabled={!selectedTypeId || grammages.length === 0}
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

  useEffect(() => {
    if (showFolds) {
      fetch("/api/admin/config/folds")
        .then((r) => r.json())
        .then(setFoldTypes)
        .catch(() => {});
    }
  }, [showFolds]);

  useEffect(() => {
    if (showLaminationFinish) {
      fetch("/api/admin/config/lamination")
        .then((r) => r.json())
        .then(setLaminationFinishes)
        .catch(() => {});
    }
  }, [showLaminationFinish]);

  const secondaryEnabled = data.secondaryFoldType === "Pli Croise";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Elements 1</h2>
        <p className="text-sm text-muted-foreground">
          Papier, couleurs et finitions pour la couverture
          {!isBrochure && " du produit"}
        </p>
      </div>

      {isBrochure ? (
        <PaperSelector
          label="Papier couverture"
          required
          paperTypes={paperTypes}
          selectedTypeId={data.paperCoverTypeId}
          selectedGrammage={data.paperCoverGrammage}
          onTypeChange={(id) =>
            updateData({ paperCoverTypeId: id, paperCoverGrammage: null })
          }
          onGrammageChange={(g) => updateData({ paperCoverGrammage: g })}
          filterCategory="COVER"
        />
      ) : (
        <PaperSelector
          label="Papier"
          required
          paperTypes={paperTypes}
          selectedTypeId={data.paperInteriorTypeId}
          selectedGrammage={data.paperInteriorGrammage}
          onTypeChange={(id) =>
            updateData({ paperInteriorTypeId: id, paperInteriorGrammage: null })
          }
          onGrammageChange={(g) => updateData({ paperInteriorGrammage: g })}
        />
      )}

      <Separator />

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">
          Couleurs d&apos;impression {isBrochure ? "— Couverture" : ""} *
        </h3>
        <Select
          value={
            isBrochure
              ? data.colorModeCoverId ?? ""
              : data.colorModeInteriorId ?? ""
          }
          onValueChange={(v) =>
            isBrochure
              ? updateData({ colorModeCoverId: v })
              : updateData({ colorModeInteriorId: v })
          }
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
                  onValueChange={(v) => updateData({ foldTypeId: v })}
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
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
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
                  laminationFinishId:
                    v === "Rien" ? null : data.laminationFinishId,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
                onValueChange={(v) => updateData({ laminationFinishId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir la finition…" />
                </SelectTrigger>
                <SelectContent>
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
    </div>
  );
}
