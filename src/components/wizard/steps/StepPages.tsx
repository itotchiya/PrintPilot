"use client";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { getMinPages, getMaxPages, isPagesValid } from "@/lib/pricing/product-rules";
import type { StepProps } from "../WizardContainer";

interface BindingType {
  id: string;
  name: string;
  minPages: number;
  maxPages: number | null;
  active: boolean;
}

export function StepPages({ data, updateData }: StepProps) {
  const [bindings, setBindings] = useState<BindingType[]>([]);

  useEffect(() => {
    fetch("/api/admin/config/binding")
      .then((r) => r.json())
      .then((all: BindingType[]) => setBindings(all.filter((b) => b.active)))
      .catch(() => {});
  }, []);

  const selectedBinding = bindings.find((b) => b.id === data.bindingTypeId);
  const bindingName = selectedBinding?.name ?? null;
  const minPages = getMinPages(bindingName);
  const maxPages = getMaxPages(bindingName);
  const pagesOk =
    data.pagesInterior != null && isPagesValid(data.pagesInterior, bindingName);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Pages et reliure</h2>
        <p className="text-sm text-muted-foreground">
          Définissez la pagination et le type de reliure
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        {/* Binding */}
        <div className="space-y-2">
          <Label>Type de reliure *</Label>
          <Select
            value={data.bindingTypeId ?? ""}
            onValueChange={(v) => updateData({ bindingTypeId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choisir la reliure…" />
            </SelectTrigger>
            <SelectContent>
              {bindings.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedBinding && (
            <p className="text-xs text-muted-foreground">
              {minPages} pages min{maxPages ? ` · ${maxPages} pages max` : " · illimité"}
            </p>
          )}
        </div>

        {/* Interior pages */}
        <div className="space-y-2">
          <Label htmlFor="pages">Pages intérieures *</Label>
          <Input
            id="pages"
            type="number"
            min={minPages}
            step={4}
            placeholder={`min ${minPages}, multiple de 4`}
            value={data.pagesInterior ?? ""}
            onChange={(e) =>
              updateData({ pagesInterior: parseInt(e.target.value) || null })
            }
            className={
              data.pagesInterior && !pagesOk
                ? "border-destructive focus-visible:ring-destructive"
                : ""
            }
          />
          {data.pagesInterior && !pagesOk && (
            <p className="text-xs text-destructive">
              {data.pagesInterior % 4 !== 0
                ? "Les pages doivent être un multiple de 4"
                : `Min ${minPages}${maxPages ? `, max ${maxPages}` : ""} pages`}
            </p>
          )}
        </div>

        {/* Cover pages — always 4, readonly */}
        <div className="space-y-2">
          <Label>Pages couverture</Label>
          <div className="flex h-10 items-center rounded-md border bg-muted px-3 text-sm">
            4 pages (fixe)
          </div>
        </div>

        {/* Total pages */}
        {pagesOk && (
          <div className="space-y-2">
            <Label>Total pages</Label>
            <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm">
              <span className="font-medium">{(data.pagesInterior ?? 0) + 4}</span>
              <Badge variant="secondary" className="text-xs">
                = {data.pagesInterior} int. + 4 couv.
              </Badge>
            </div>
          </div>
        )}
      </div>

      {/* Flap / Rabat */}
      <div className="space-y-2">
        <Label htmlFor="flap">
          Rabat (cm){" "}
          <span className="font-normal text-muted-foreground">— optionnel</span>
        </Label>
        <Input
          id="flap"
          type="number"
          step="0.5"
          min="0"
          placeholder="0 = pas de rabat"
          value={data.flapSizeCm || ""}
          onChange={(e) =>
            updateData({ flapSizeCm: parseFloat(e.target.value) || 0 })
          }
          className="max-w-xs"
        />
        <p className="text-xs text-muted-foreground">
          Taille du rabat ajoutée à la largeur de la couverture
        </p>
      </div>
    </div>
  );
}
