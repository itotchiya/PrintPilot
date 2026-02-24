"use client";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { blurActiveElement, onWizardSelectTriggerPointerDown } from "../selectBlurFix";
import { Separator } from "@/components/ui/separator";
import { PlusCircle, Trash2 } from "lucide-react";
import { canHaveCrystalBox } from "@/lib/pricing/product-rules";
import type { StepProps } from "../WizardContainer";
import type { QuoteDeliveryPoint } from "@/lib/pricing/types";

interface Department {
  id: string;
  code: string;
  name: string;
  zone: number;
  displayName: string;
}

const FALLBACK_DEPARTMENTS: Department[] = [
  { id: "fb-d-75", code: "75", name: "Paris", zone: 3, displayName: "75 - Paris" },
  { id: "fb-d-69", code: "69", name: "Rhone", zone: 4, displayName: "69 - Rhone" },
  { id: "fb-d-13", code: "13", name: "Bouches-du-Rhone", zone: 5, displayName: "13 - Bouches-du-Rhone" },
  { id: "fb-d-33", code: "33", name: "Gironde", zone: 5, displayName: "33 - Gironde" },
  { id: "fb-d-59", code: "59", name: "Nord", zone: 3, displayName: "59 - Nord" },
  { id: "fb-d-31", code: "31", name: "Haute-Garonne", zone: 5, displayName: "31 - Haute-Garonne" },
];

function parseDepartments(raw: unknown): Department[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((d: Record<string, unknown>) => ({
    id: String(d.id ?? d.code ?? ""),
    code: String(d.code ?? ""),
    name: String(d.name ?? ""),
    zone: Number(d.zone) ?? 3,
    displayName: String(d.displayName ?? d.name ?? `${d.code} - ${d.name}`),
  })).filter((x) => x.id && x.code);
}

export function StepDelivery({ data, updateData }: StepProps) {
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch("/api/admin/config/delivery")
      .then((r) => (r.ok ? r.json() : []))
      .then((raw: unknown) => {
        const list = parseDepartments(raw);
        setDepartments(list.length > 0 ? list : FALLBACK_DEPARTMENTS);
      })
      .catch(() => setDepartments(FALLBACK_DEPARTMENTS));
  }, []);

  const totalCopies = data.deliveryPoints.reduce((s, p) => s + p.copies, 0);
  const showCrystalBox = canHaveCrystalBox(data.productType);

  function updatePoint(index: number, patch: Partial<QuoteDeliveryPoint>) {
    const updated = data.deliveryPoints.map((p, i) =>
      i === index ? { ...p, ...patch } : p
    );
    updateData({ deliveryPoints: updated });
  }

  function addPoint() {
    if (data.deliveryPoints.length >= 5) return;
    updateData({
      deliveryPoints: [
        ...data.deliveryPoints,
        {
          copies: 0,
          departmentCode: "",
          departmentName: "",
          zone: 0,
          hayon: false,
        },
      ],
    });
  }

  function removePoint(index: number) {
    if (data.deliveryPoints.length <= 1) return;
    updateData({
      deliveryPoints: data.deliveryPoints.filter((_, i) => i !== index),
    });
  }

  function handleDepartmentChange(index: number, deptId: string) {
    const dept = departments.find((d) => d.id === deptId);
    if (dept) {
      updatePoint(index, {
        departmentCode: dept.code,
        departmentName: dept.name,
        zone: dept.zone,
      });
    }
  }

  function getDeptIdByCode(code: string): string {
    return departments.find((d) => d.code === code)?.id ?? "";
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">
          Livraison &amp; conditionnement
        </h2>
        <p className="text-sm text-muted-foreground">
          Emballage et points de livraison
        </p>
      </div>

      {/* Packaging */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Conditionnement
        </h3>
        <div className="space-y-1">
          <div className="flex items-center justify-between py-2.5 px-1">
            <Label htmlFor="pkg-cartons" className="cursor-pointer font-normal">
              Mise en cartons
            </Label>
            <Switch
              id="pkg-cartons"
              checked={data.packaging.cartons}
              onCheckedChange={(v) =>
                updateData({ packaging: { ...data.packaging, cartons: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between py-2.5 px-1">
            <Label htmlFor="pkg-film" className="cursor-pointer font-normal">
              Mise sous film
            </Label>
            <Switch
              id="pkg-film"
              checked={data.packaging.film}
              onCheckedChange={(v) =>
                updateData({ packaging: { ...data.packaging, film: v } })
              }
            />
          </div>
          <div className="flex items-center justify-between py-2.5 px-1">
            <Label
              htmlFor="pkg-elastiques"
              className="cursor-pointer font-normal"
            >
              Mise sous élastiques
            </Label>
            <Switch
              id="pkg-elastiques"
              checked={data.packaging.elastiques}
              onCheckedChange={(v) =>
                updateData({ packaging: { ...data.packaging, elastiques: v } })
              }
            />
          </div>
          {showCrystalBox && (
            <div className="flex items-center justify-between py-2.5 px-1">
              <Label htmlFor="crystalBoxQty" className="font-normal">
                Nombre de boîtes cristal
              </Label>
              <Input
                id="crystalBoxQty"
                type="number"
                min={0}
                value={data.packaging.crystalBoxQty || ""}
                onChange={(e) =>
                  updateData({
                    packaging: {
                      ...data.packaging,
                      crystalBoxQty: Math.max(0, Number(e.target.value)),
                    },
                  })
                }
                placeholder="0"
                className="w-24 h-8 text-right"
              />
            </div>
          )}
        </div>
      </div>

      <Separator />

      {/* Delivery points */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="text-sm font-semibold text-foreground">
            Points de livraison
          </h3>
          {data.quantity > 0 && totalCopies === data.quantity ? (
            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
              ✓ Quantité répartie correctement
            </span>
          ) : data.quantity > 0 && totalCopies < data.quantity ? (
            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium">
              ⚠ Quantité incomplète : {totalCopies.toLocaleString("fr-FR")} /{" "}
              {data.quantity.toLocaleString("fr-FR")}
            </span>
          ) : totalCopies > data.quantity ? (
            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
              ⚠ Trop réparti : {totalCopies.toLocaleString("fr-FR")} /{" "}
              {data.quantity.toLocaleString("fr-FR")}
            </span>
          ) : null}
        </div>

        <div className="space-y-3">
          {data.deliveryPoints.map((point, index) => {
            const deptId = getDeptIdByCode(point.departmentCode);
            return (
              <div
                key={index}
                className="rounded-lg border bg-muted/30 p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                    Point {index + 1}
                  </span>
                  {data.deliveryPoints.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removePoint(index)}
                      className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                      <span className="sr-only">Supprimer</span>
                    </Button>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Département
                    </Label>
                    <Select
                      value={deptId}
                      onValueChange={(v) => handleDepartmentChange(index, v)}
                      onOpenChange={(open) => open && blurActiveElement()}
                    >
                      <SelectTrigger className="h-9" onPointerDown={onWizardSelectTriggerPointerDown}>
                        <SelectValue placeholder="Choisir le département…" />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4} className="z-[100]">
                        {departments.map((d) => (
                          <SelectItem key={d.id} value={d.id}>
                            {d.displayName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label
                      htmlFor={`copies-${index}`}
                      className="text-xs text-muted-foreground"
                    >
                      Nombre d&apos;exemplaires
                    </Label>
                    <Input
                      id={`copies-${index}`}
                      type="number"
                      min={0}
                      value={point.copies || ""}
                      onChange={(e) =>
                        updatePoint(index, {
                          copies: Math.max(0, Number(e.target.value)),
                        })
                      }
                      placeholder="0"
                      className="h-9"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <Label
                    htmlFor={`hayon-${index}`}
                    className="text-sm cursor-pointer font-normal"
                  >
                    Hayon hydraulique
                  </Label>
                  <Switch
                    id={`hayon-${index}`}
                    checked={point.hayon}
                    onCheckedChange={(v) => updatePoint(index, { hayon: v })}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={addPoint}
          disabled={data.deliveryPoints.length >= 5}
          className="w-full"
        >
          <PlusCircle className="size-4" />
          Ajouter un point
        </Button>
      </div>

      <Separator />

      {/* Client info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground">
          Informations client
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="clientName">Nom du client</Label>
            <Input
              id="clientName"
              value={data.clientName}
              onChange={(e) => updateData({ clientName: e.target.value })}
              placeholder="Société ou nom…"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="projectName">Nom du projet</Label>
            <Input
              id="projectName"
              value={data.projectName}
              onChange={(e) => updateData({ projectName: e.target.value })}
              placeholder="Référence ou nom du devis…"
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">
            Notes internes{" "}
            <span className="text-muted-foreground font-normal">
              (optionnel)
            </span>
          </Label>
          <textarea
            id="notes"
            value={data.notes}
            onChange={(e) => updateData({ notes: e.target.value })}
            placeholder="Remarques, contraintes particulières…"
            rows={3}
            className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
