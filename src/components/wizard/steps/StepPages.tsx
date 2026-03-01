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
import { blurActiveElement, onWizardSelectTriggerPointerDown } from "../selectBlurFix";
import type { StepProps } from "../WizardContainer";

interface BindingType {
  id: string;
  name: string;
  minPages: number;
  maxPages: number | null;
  active: boolean;
}

const FALLBACK_BINDINGS: BindingType[] = [
  { id: "fb-b-1", name: "Piqure", minPages: 4, maxPages: 96, active: true },
  { id: "fb-b-2", name: "Dos carre colle", minPages: 32, maxPages: null, active: true },
  { id: "fb-b-3", name: "Dos carre colle PUR", minPages: 32, maxPages: null, active: true },
  { id: "fb-b-4", name: "Dos carre colle avec couture", minPages: 32, maxPages: null, active: true },
];

function parseBindings(raw: unknown): BindingType[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((b: Record<string, unknown>) => ({
    id: String(b.id ?? ""),
    name: String(b.name ?? ""),
    minPages: Number(b.minPages) ?? 4,
    maxPages: b.maxPages != null ? Number(b.maxPages) : null,
    active: b.active !== false,
  })).filter((x) => x.id && x.name);
}

export function StepPages({ data, updateData }: StepProps) {
  const [bindings, setBindings] = useState<BindingType[]>([]);

  useEffect(() => {
    fetch("/api/admin/config/binding")
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: unknown) => {
        const list = parseBindings(raw).filter((b) => b.active);
        setBindings(list.length > 0 ? list : FALLBACK_BINDINGS);
      })
      .catch(() => setBindings(FALLBACK_BINDINGS));
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
            onValueChange={(v) => {
              const b = bindings.find((x) => x.id === v);
              const name = b?.name ?? null;
              const isDosCarre = name && /Dos carr[eé]|PUR/i.test(name);
              const cover = data.pagesCover ?? 4;
              // Excel: "Indiquez forcément une couverture si Dos carré collé"
              updateData({
                bindingTypeId: v,
                bindingTypeName: name,
                ...(isDosCarre && cover === 0 ? { pagesCover: 4 } : {}),
              });
            }}
            onOpenChange={(open) => open && blurActiveElement()}
          >
            <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
              <SelectValue placeholder="Choisir la reliure…" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="z-[100]">
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

        {/* Cover pages — 0, 2 or 4 (Excel: 0 = pas de couverture, 2 = recto seul, 4 = recto verso) */}
        <div className="space-y-2">
          <Label>Pages couverture</Label>
          <Select
            value={String(data.pagesCover ?? 4)}
            onValueChange={(v) => updateData({ pagesCover: Number(v) })}
            onOpenChange={(open) => open && blurActiveElement()}
          >
            <SelectTrigger onPointerDown={onWizardSelectTriggerPointerDown}>
              <SelectValue placeholder="Choisir…" />
            </SelectTrigger>
            <SelectContent position="popper" sideOffset={4} className="z-[100]">
              <SelectItem value="0">0 — Pas de couverture</SelectItem>
              <SelectItem value="2">2 — Couverture recto seul</SelectItem>
              <SelectItem value="4">4 — Couverture recto verso</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Indiquez 0 si pas de couverture, 2 si couverture recto seul, 4 si recto verso.
            {bindingName && /Dos carr[eé]|PUR/i.test(bindingName) && (
              <span className="mt-1 block font-medium text-amber-600 dark:text-amber-500">
                Dos carré collé : une couverture (2 ou 4 pages) est obligatoire.
              </span>
            )}
          </p>
        </div>

        {/* Total pages */}
        {pagesOk && (
          <div className="space-y-2">
            <Label>Total pages</Label>
            <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm">
              <span className="font-medium">{(data.pagesInterior ?? 0) + (data.pagesCover ?? 4)}</span>
              <Badge variant="secondary" className="text-xs">
                = {data.pagesInterior} int. + {data.pagesCover ?? 4} couv.
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
