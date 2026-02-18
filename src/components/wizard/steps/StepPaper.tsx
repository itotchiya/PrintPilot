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
import { canHaveCover, canHaveInterior } from "@/lib/pricing/product-rules";
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
      (!filterCategory || p.category === filterCategory || p.category === "BOTH"),
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

export function StepPaper({ data, updateData }: StepProps) {
  const [paperTypes, setPaperTypes] = useState<PaperType[]>([]);

  useEffect(() => {
    fetch("/api/admin/config/paper")
      .then((r) => r.json())
      .then(setPaperTypes)
      .catch(() => {});
  }, []);

  const showCover = canHaveCover(data.productType);
  const showInterior = canHaveInterior(data.productType);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">Choix du papier</h2>
        <p className="text-sm text-muted-foreground">
          Sélectionnez le type et le grammage du papier
        </p>
      </div>

      {showCover && (
        <>
          <PaperSelector
            label="Couverture"
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
          {showInterior && <Separator />}
        </>
      )}

      {showInterior ? (
        <PaperSelector
          label="Intérieur"
          required
          paperTypes={paperTypes}
          selectedTypeId={data.paperInteriorTypeId}
          selectedGrammage={data.paperInteriorGrammage}
          onTypeChange={(id) =>
            updateData({ paperInteriorTypeId: id, paperInteriorGrammage: null })
          }
          onGrammageChange={(g) => updateData({ paperInteriorGrammage: g })}
          filterCategory="INTERIOR"
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
    </div>
  );
}
