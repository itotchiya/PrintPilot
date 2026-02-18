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
import { canHaveCover, canHaveInterior, canHaveRectoVerso } from "@/lib/pricing/product-rules";
import type { StepProps } from "../WizardContainer";

interface ColorMode {
  id: string;
  name: string;
  platesPerSide: number;
  hasVarnish: boolean;
  active: boolean;
}

export function StepColors({ data, updateData }: StepProps) {
  const [colorModes, setColorModes] = useState<ColorMode[]>([]);

  useEffect(() => {
    fetch("/api/admin/config/colors")
      .then((r) => r.json())
      .then((all: ColorMode[]) => setColorModes(all.filter((c) => c.active)))
      .catch(() => {});
  }, []);

  const showCover = canHaveCover(data.productType);
  const showInterior = canHaveInterior(data.productType);
  const showRV = canHaveRectoVerso(data.productType);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Couleurs d&apos;impression</h2>
        <p className="text-sm text-muted-foreground">
          Choisissez le mode couleur pour votre produit
        </p>
      </div>

      {showCover && (
        <div className="space-y-2">
          <Label>Couleurs — Couverture *</Label>
          <Select
            value={data.colorModeCoverId ?? ""}
            onValueChange={(v) => updateData({ colorModeCoverId: v })}
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
      )}

      {showCover && showInterior && <Separator />}

      {showInterior ? (
        <div className="space-y-2">
          <Label>Couleurs — Intérieur *</Label>
          <Select
            value={data.colorModeInteriorId ?? ""}
            onValueChange={(v) => updateData({ colorModeInteriorId: v })}
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
      ) : (
        <div className="space-y-2">
          <Label>Couleurs d&apos;impression *</Label>
          <Select
            value={data.colorModeInteriorId ?? ""}
            onValueChange={(v) => updateData({ colorModeInteriorId: v })}
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
      )}

      {showRV && (
        <>
          <Separator />
          <div className="flex items-center justify-between rounded-xl border bg-card p-4">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Recto-Verso</Label>
              <p className="text-xs text-muted-foreground">Impression sur les deux faces</p>
            </div>
            <Switch
              checked={data.rectoVerso}
              onCheckedChange={(v) => updateData({ rectoVerso: v })}
            />
          </div>
        </>
      )}
    </div>
  );
}
