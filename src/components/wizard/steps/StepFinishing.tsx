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
import { canHaveBinding, canHaveFolds } from "@/lib/pricing/product-rules";
import type { StepProps } from "../WizardContainer";

interface BindingType {
  id: string;
  name: string;
  minPages: number;
  maxPages: number | null;
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

export function StepFinishing({ data, updateData }: StepProps) {
  const [bindingTypes, setBindingTypes] = useState<BindingType[]>([]);
  const [foldTypes, setFoldTypes] = useState<FoldType[]>([]);
  const [laminationFinishes, setLaminationFinishes] = useState<
    LaminationFinish[]
  >([]);

  const showBinding = canHaveBinding(data.productType);
  const showFolds = canHaveFolds(data.productType);
  const showLaminationFinish = data.laminationMode !== "Rien";

  useEffect(() => {
    if (showBinding) {
      fetch("/api/admin/config/binding")
        .then((r) => r.json())
        .then(setBindingTypes)
        .catch(() => {});
    }
  }, [showBinding]);

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
        <h2 className="text-xl font-bold text-foreground">Finitions</h2>
        <p className="text-sm text-muted-foreground">
          Reliure, pliage et pelliculage selon le type de produit
        </p>
      </div>

      {showBinding && (
        <>
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-foreground">
              Reliure *
            </h3>
            <div className="space-y-2">
              <Label>Type de reliure</Label>
              <Select
                value={data.bindingTypeId ?? ""}
                onValueChange={(v) => updateData({ bindingTypeId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choisir la reliure…" />
                </SelectTrigger>
                <SelectContent>
                  {bindingTypes
                    .filter((b) => b.active)
                    .map((b) => (
                      <SelectItem key={b.id} value={b.id}>
                        {b.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Separator />
        </>
      )}

      {showFolds && (
        <>
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
          <Separator />
        </>
      )}

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
