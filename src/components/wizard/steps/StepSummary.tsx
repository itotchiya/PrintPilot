"use client";
import { useState, useCallback, useEffect } from "react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Calculator,
  Loader2,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Save,
  Monitor,
  Layers,
  Star,
  FileText,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { getStepLabel, getVisibleSteps } from "@/lib/pricing/product-rules";
import { canHaveCover, canHaveInterior } from "@/lib/pricing/product-rules";
import type { StepProps } from "../WizardContainer";
import type { QuoteInput } from "@/lib/pricing/types";
import { getWizardTrackingSnapshot } from "@/lib/pricing/wizard-tracking";
import type { DigitalBreakdown } from "@/lib/pricing/digital";
import type { OffsetBreakdown } from "@/lib/pricing/offset";

interface CalculationVariable {
  name: string;
  value: string | number;
  formula?: string;
}

interface PricingResult {
  digitalTotal: number;
  offsetTotal: number;
  digitalBreakdown: DigitalBreakdown;
  offsetBreakdown: OffsetBreakdown;
  deliveryCost: number;
  weightPerCopyGrams: number;
  currency: "EUR";
  calculationVariablesInputs?: CalculationVariable[];
  calculationVariablesNumerique?: CalculationVariable[];
  calculationVariablesOffset?: CalculationVariable[];
}

interface BatchResultItem extends PricingResult {
  fournisseurId: string;
  fournisseurName: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  BROCHURE: "Brochure",
  DEPLIANT: "Depliant",
  FLYER: "Flyer / Poster",
  CARTE_DE_VISITE: "Carte de visite",
};

function BreakdownRow({ label, value }: { label: string; value: number }) {
  if (value === 0) return null;
  return (
    <div className="flex justify-between text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{formatCurrency(value)}</span>
    </div>
  );
}

function VariableList({ variables }: { variables: CalculationVariable[] }) {
  return (
    <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
      {variables.map((v, i) => (
        <div key={i} className="flex flex-col gap-0.5 py-1.5">
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground shrink-0">{v.name}</span>
            <span className="tabular-nums font-medium">
              {typeof v.value === "number"
                ? (v.value % 1 === 0
                    ? v.value
                    : Math.abs(v.value) < 1 && v.value !== 0
                      ? v.value.toFixed(3)
                      : v.value.toFixed(2))
                : v.value}
            </span>
          </div>
          {v.formula && (
            <p className="text-xs text-muted-foreground font-mono break-all pr-2">
              {v.formula}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Single row: label (muted) + value (right), same style as Entrées du devis / VariableList */
function PreviewRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex flex-col gap-0.5 py-1.5">
      <div className="flex justify-between gap-2">
        <span className="text-muted-foreground shrink-0">{label}</span>
        <span className="tabular-nums font-medium">
          {typeof value === "number" ? value.toLocaleString("fr-FR") : value}
        </span>
      </div>
    </div>
  );
}

/** Step block: title + two-column grid of label/value rows (same layout as Entrées du devis) */
function PreviewStepBlock({
  stepNumber,
  title,
  rows,
}: {
  stepNumber: number;
  title: string;
  rows: { name: string; value: string | number }[];
}) {
  if (rows.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Étape {stepNumber} — {title}
      </p>
      <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map((r, i) => (
          <PreviewRow key={i} label={r.name} value={r.value} />
        ))}
      </div>
    </div>
  );
}

/** Builds rows { name, value } for one step so we can render them in a two-column grid. */
function getPreviewRowsForStep(
  wizardStep: number,
  displayStepNumber: number,
  data: QuoteInput
): { name: string; value: string | number }[] {
  const rows: { name: string; value: string | number }[] = [];

  if (wizardStep === 1) {
    rows.push({ name: "Produit", value: PRODUCT_LABELS[data.productType ?? ""] ?? "—" });
    return rows;
  }

  if (wizardStep === 2) {
    rows.push({ name: "Quantité", value: data.quantity.toLocaleString("fr-FR") });
    rows.push({
      name: "Format",
      value: data.format
        ? `${data.format.widthCm} × ${data.format.heightCm} cm`
        : "—",
    });
    if ((data.productType === "BROCHURE" || data.productType === "DEPLIANT") && data.openFormat) {
      rows.push({
        name: "Format à plat",
        value: `${data.openFormat.widthCm} × ${data.openFormat.heightCm} cm`,
      });
    }
    return rows;
  }

  if (wizardStep === 3) {
    if (data.pagesInterior != null && data.pagesInterior > 0) {
      rows.push({ name: "Pages intérieur", value: data.pagesInterior });
    }
    if (data.productType === "BROCHURE" && data.pagesCover > 0) {
      rows.push({ name: "Pages couverture", value: data.pagesCover });
    }
    if (data.bindingTypeId) {
      rows.push({ name: "Reliure", value: data.bindingTypeName ?? "Oui" });
    }
    if (data.productType === "BROCHURE" && data.flapSizeCm != null && data.flapSizeCm > 0) {
      rows.push({ name: "Rabat (cm)", value: data.flapSizeCm });
    }
    if (rows.length === 0) rows.push({ name: "—", value: "—" });
    return rows;
  }

  if (wizardStep === 4) {
    if (canHaveCover(data.productType)) {
      if (data.paperCoverTypeName) {
        rows.push({ name: "Papier couverture (type)", value: data.paperCoverTypeName });
      }
      if (data.paperCoverGrammage != null && data.paperCoverGrammage > 0) {
        rows.push({ name: "Papier couverture", value: `${data.paperCoverGrammage} g/m²` });
      }
    } else {
      if (data.paperInteriorTypeName) {
        rows.push({ name: "Papier (type)", value: data.paperInteriorTypeName });
      }
      if (data.paperInteriorGrammage != null && data.paperInteriorGrammage > 0) {
        rows.push({ name: "Papier", value: `${data.paperInteriorGrammage} g/m²` });
      }
    }
    rows.push({
      name: canHaveCover(data.productType) ? "Couleurs couverture" : "Couleurs",
      value: (canHaveCover(data.productType)
        ? data.colorModeCoverName
        : data.colorModeInteriorName) ?? "—",
    });
    if (data.productType !== "BROCHURE") {
      rows.push({ name: "Recto verso", value: data.rectoVerso ? "Oui" : "Non" });
    }
    if (data.foldTypeId || data.foldCount > 0) {
      if (data.foldTypeName) rows.push({ name: "Type de pli", value: data.foldTypeName });
      rows.push({
        name: "Pliage",
        value:
          data.secondaryFoldType === "Pli Croise" && data.secondaryFoldCount > 0
            ? `${data.foldCount} + ${data.secondaryFoldCount} pli croisé`
            : `${data.foldCount} pli(s)`,
      });
    }
    rows.push({
      name: "Pelliculage",
      value:
        data.laminationMode +
        (data.laminationFinishName && data.laminationMode !== "Rien"
          ? ` — ${data.laminationFinishName}`
          : ""),
    });
    return rows;
  }

  if (wizardStep === 5) {
    if (data.paperInteriorTypeName) {
      rows.push({ name: "Papier intérieur (type)", value: data.paperInteriorTypeName });
    }
    if (data.paperInteriorGrammage != null && data.paperInteriorGrammage > 0) {
      rows.push({ name: "Papier intérieur", value: `${data.paperInteriorGrammage} g/m²` });
    }
    rows.push({
      name: "Couleurs intérieur",
      value: data.colorModeInteriorName ?? (data.colorModeInteriorId ? "Oui" : "—"),
    });
    return rows;
  }

  if (wizardStep === 6) {
    const pack: string[] = [];
    if (data.packaging?.cartons) pack.push("Cartons");
    if (data.packaging?.film) pack.push("Film");
    if (data.packaging?.elastiques) pack.push("Élastiques");
    if ((data.packaging?.crystalBoxQty ?? 0) > 0) {
      pack.push(`Coffrets : ${data.packaging!.crystalBoxQty}`);
    }
    rows.push({
      name: "Conditionnement",
      value: pack.length > 0 ? pack.join(", ") : "—",
    });
    const points = (data.deliveryPoints ?? [])
      .filter((p) => p.copies > 0 && (p.departmentName || p.departmentCode))
      .map(
        (p) =>
          `${p.departmentName || p.departmentCode || "Département"} — ${p.copies.toLocaleString("fr-FR")} ex.${p.zone > 0 ? ` · Zone ${p.zone}` : ""}${p.hayon ? " · Hayon" : ""}`
      );
    rows.push({
      name: "Points de livraison",
      value: points.length > 0 ? points.join(" ; ") : "—",
    });
    return rows;
  }

  return rows;
}

/** Renders preview by step with two-column layout (label + value), same style as Entrées du devis. */
function PreviewSections({ data }: { data: QuoteInput }) {
  const visibleSteps = getVisibleSteps(data.productType).filter((s) => s !== 7);

  return (
    <div className="rounded-xl border bg-muted/40 p-4 space-y-5 text-sm">
      {visibleSteps.map((wizardStep, index) => {
        const displayStepNumber = index + 1;
        const title = wizardStep === 6 ? "Livraison & conditionnement" : getStepLabel(wizardStep);
        const rows = getPreviewRowsForStep(wizardStep, displayStepNumber, data);
        if (rows.length === 0) return null;
        return (
          <div key={wizardStep}>
            {index > 0 && <Separator className="my-4" />}
            <PreviewStepBlock stepNumber={displayStepNumber} title={title} rows={rows} />
          </div>
        );
      })}
      {/* Infos projet — same two-column layout */}
      {(data.clientName?.trim() || data.projectName?.trim() || data.notes?.trim()) && (
        <>
          <Separator className="my-4" />
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Infos projet
            </p>
            <div className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {data.clientName?.trim() && (
                <PreviewRow label="Client" value={data.clientName.trim()} />
              )}
              {data.projectName?.trim() && (
                <PreviewRow label="Projet" value={data.projectName.trim()} />
              )}
              {data.notes?.trim() && (
                <div className="flex flex-col gap-0.5 py-1.5 sm:col-span-2">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground shrink-0">Notes</span>
                    <span className="font-medium">{data.notes.trim()}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function PriceCard({
  title,
  total,
  breakdown,
  recommended,
  selected,
  onSelect,
  methodKey,
  selecting,
}: {
  title: string;
  total: number;
  breakdown: DigitalBreakdown | OffsetBreakdown;
  recommended?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  methodKey: "digital" | "offset";
  selecting?: string | null;
}) {
  const isDigital = "clickCostInterior" in breakdown;
  const Icon = isDigital ? Monitor : Layers;
  return (
    <Card
      className={
        selected
          ? "border-primary ring-1 ring-primary shadow-md"
          : recommended
            ? "border-primary/50 shadow-md"
            : ""
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            {recommended && (
              <Badge className="bg-green-100 text-green-700 border-transparent dark:bg-green-900/30 dark:text-green-400 text-xs">
                <Star className="mr-1 h-3 w-3" />
                Recommandé
              </Badge>
            )}
            {selected && (
              <Badge className="bg-primary/10 text-primary border-transparent text-xs">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                Sélectionné
              </Badge>
            )}
          </div>
        </div>
        <p className="text-3xl font-bold text-foreground tabular-nums">
          {formatCurrency(total)}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <Separator className="mb-3" />
        {isDigital ? (
          <>
            <BreakdownRow
              label="Clics intérieur"
              value={(breakdown as DigitalBreakdown).clickCostInterior}
            />
            <BreakdownRow
              label="Clics couverture"
              value={(breakdown as DigitalBreakdown).clickCostCover}
            />
            <BreakdownRow
              label="Papier intérieur"
              value={breakdown.paperCostInterior}
            />
            <BreakdownRow
              label="Papier couverture"
              value={breakdown.paperCostCover}
            />
            <BreakdownRow
              label="Mise en route"
              value={(breakdown as DigitalBreakdown).setupCost}
            />
            <BreakdownRow
              label="Traitement fichier"
              value={(breakdown as DigitalBreakdown).fileProcessing}
            />
          </>
        ) : (
          <>
            <BreakdownRow
              label="Papier intérieur"
              value={breakdown.paperCostInterior}
            />
            <BreakdownRow
              label="Papier couverture"
              value={breakdown.paperCostCover}
            />
            <BreakdownRow
              label="Plaques"
              value={(breakdown as OffsetBreakdown).plateCost}
            />
            <BreakdownRow
              label="Calage"
              value={(breakdown as OffsetBreakdown).calageCost}
            />
            <BreakdownRow
              label="Roulage"
              value={(breakdown as OffsetBreakdown).runningCost}
            />
            <BreakdownRow
              label="Fichiers"
              value={(breakdown as OffsetBreakdown).fileProcessing}
            />
          </>
        )}
        <BreakdownRow label="Reliure / Façonnage" value={breakdown.bindingCost} />
        <BreakdownRow label="Pelliculage" value={breakdown.laminationCost} />
        <BreakdownRow label="Livraison" value={breakdown.deliveryCost} />
        <Separator className="my-2" />
        <div className="flex justify-between text-sm font-semibold">
          <span>Total HT</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
        {onSelect && (
          <Button
            variant={selected ? "default" : "outline"}
            className="w-full mt-2"
            size="sm"
            onClick={onSelect}
            disabled={selecting !== null}
          >
            {selecting === methodKey ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {selected ? "Méthode sélectionnée" : "Choisir cette méthode"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function StepSummary({ data, onNext, onReset }: StepProps) {
  void onNext;
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;
  const isAcheteur = role === "ACHETEUR";

  // Log full wizard tracking when summary step is shown (matches Entrées du devis — all steps included)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot = getWizardTrackingSnapshot(data);
    console.group("[PrintPilot Wizard] Récapitulatif — état complet ( = Entrées du devis )");
    console.log("Ce snapshot inclut toutes les étapes (livraison, conditionnement, client, projet, notes).");
    console.log("Product type", data.productType ?? null);
    console.log("Tracking snapshot", snapshot);
    console.log("Snapshot (complet — tous les champs)", JSON.stringify(snapshot, null, 2));
    console.log("Données brutes", JSON.parse(JSON.stringify(data)));
    console.groupEnd();
  }, [data]);

  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [batchResult, setBatchResult] = useState<BatchResultItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"digital" | "offset" | null>(null);
  const [saveState, setSaveState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    quoteId?: string;
    quoteNumber?: string;
  }>({ status: "idle" });

  const [allowedFournisseurs, setAllowedFournisseurs] = useState<{ id: string; name: string }[]>([]);
  const [selectedFournisseurIds, setSelectedFournisseurIds] = useState<string[]>([]);

  useEffect(() => {
    if (!isAcheteur) return;
    fetch("/api/acheteur/fournisseurs")
      .then((r) => r.ok ? r.json() : null)
      .then((json: { fournisseurs?: { id: string; name: string }[] } | null) => {
        if (json?.fournisseurs) setAllowedFournisseurs(json.fournisseurs);
      })
      .catch(() => {});
  }, [isAcheteur]);

  const toggleFournisseur = (id: string) => {
    setSelectedFournisseurIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // When result appears, set default selected method to recommended
  const effectiveMethod =
    selectedMethod ??
    (result
      ? result.digitalTotal <= result.offsetTotal
        ? "digital"
        : "offset"
      : null);

  const handleCalculate = useCallback(async () => {
    setIsCalculating(true);
    setError(null);
    setSaveState({ status: "idle" });
    const snapshot = getWizardTrackingSnapshot(data);
    if (typeof window !== "undefined") {
      console.groupCollapsed("[PrintPilot Wizard] Calcul — payload et snapshot");
      console.log("Tracking snapshot", snapshot);
      console.log("Snapshot (complet — tous les champs)", JSON.stringify(snapshot, null, 2));
      if (isAcheteur && selectedFournisseurIds.length > 0) {
        console.log("Payload (calculate-batch)", {
          quoteInput: data,
          fournisseurIds: selectedFournisseurIds,
        });
      } else if (!isAcheteur) {
        const body =
          role === "FOURNISSEUR" && (session?.user as { id?: string } | undefined)?.id
            ? { ...data, fournisseurId: (session!.user as { id: string }).id }
            : data;
        console.log("Payload (calculate)", body);
      }
      console.groupEnd();
    }
    try {
      if (isAcheteur && selectedFournisseurIds.length > 0) {
        const res = await fetch("/api/pricing/calculate-batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            quoteInput: data,
            fournisseurIds: selectedFournisseurIds,
          }),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur de calcul");
        setBatchResult((json.results ?? []) as BatchResultItem[]);
        setResult(null);
      } else if (!isAcheteur) {
        const body =
          role === "FOURNISSEUR" && (session?.user as { id?: string } | undefined)?.id
            ? { ...data, fournisseurId: (session!.user as { id: string }).id }
            : data;
        const res = await fetch("/api/pricing/calculate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Erreur de calcul");
        if (json.status === "pending") {
          setError("Moteur de calcul en cours d implementation.");
          return;
        }
        const resultData = json as PricingResult;
        setResult(resultData);
        setBatchResult(null);
        setSelectedMethod(
          resultData.digitalTotal <= resultData.offsetTotal ? "digital" : "offset"
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsCalculating(false);
    }
  }, [data, isAcheteur, selectedFournisseurIds, role, session?.user]);

  const handleSave = useCallback(async () => {
    if (batchResult?.length) {
      setSaveState({ status: "saving" });
      const first = batchResult[0];
      const savePayload = {
        ...data,
        digitalTotal: first.digitalTotal,
        offsetTotal: first.offsetTotal,
        digitalBreakdown: first.digitalBreakdown,
        offsetBreakdown: first.offsetBreakdown,
        deliveryCost: first.deliveryCost,
        weightPerCopyGrams: first.weightPerCopyGrams,
        selectedMethod: first.digitalTotal <= first.offsetTotal ? "digital" : "offset",
        fournisseurResults: batchResult.map((r) => ({
          fournisseurId: r.fournisseurId,
          fournisseurName: r.fournisseurName,
          digitalTotal: r.digitalTotal,
          offsetTotal: r.offsetTotal,
          digitalBreakdown: r.digitalBreakdown,
          offsetBreakdown: r.offsetBreakdown,
          deliveryCost: r.deliveryCost,
          selectedMethod: r.digitalTotal <= r.offsetTotal ? "digital" : "offset",
        })),
      };
      if (typeof window !== "undefined") {
        const saveSnapshot = getWizardTrackingSnapshot(data);
        console.groupCollapsed("[PrintPilot Wizard] Sauvegarde — payload et snapshot");
        console.log("Tracking snapshot", saveSnapshot);
        console.log("Snapshot (complet — tous les champs)", JSON.stringify(saveSnapshot, null, 2));
        console.log("Payload (POST /api/quotes)", savePayload);
        console.groupEnd();
      }
      try {
        const res = await fetch("/api/quotes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(savePayload),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.error);
        setSaveState({
          status: "saved",
          quoteId: json.id,
          quoteNumber: json.quoteNumber,
        });
      } catch (e) {
        setSaveState({ status: "idle" });
        toast.error(
          e instanceof Error ? e.message : "Erreur lors de la sauvegarde"
        );
      }
      return;
    }
    if (!result) return;
    const methodToSave = effectiveMethod ?? (result.digitalTotal <= result.offsetTotal ? "digital" : "offset");
    setSaveState({ status: "saving" });
    const savePayloadSingle = {
      ...data,
      digitalTotal: result.digitalTotal,
      offsetTotal: result.offsetTotal,
      digitalBreakdown: result.digitalBreakdown,
      offsetBreakdown: result.offsetBreakdown,
      deliveryCost: result.deliveryCost,
      weightPerCopyGrams: result.weightPerCopyGrams,
      selectedMethod: methodToSave,
    };
    if (typeof window !== "undefined") {
      const saveSnapshotSingle = getWizardTrackingSnapshot(data);
      console.groupCollapsed("[PrintPilot Wizard] Sauvegarde — payload et snapshot");
      console.log("Tracking snapshot", saveSnapshotSingle);
      console.log("Snapshot (complet — tous les champs)", JSON.stringify(saveSnapshotSingle, null, 2));
      console.log("Payload (POST /api/quotes)", savePayloadSingle);
      console.groupEnd();
    }
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(savePayloadSingle),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setSaveState({
        status: "saved",
        quoteId: json.id,
        quoteNumber: json.quoteNumber,
      });
    } catch (e) {
      setSaveState({ status: "idle" });
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de la sauvegarde"
      );
    }
  }, [data, result, effectiveMethod, batchResult]);

  function handleReset() {
    if (onReset) {
      onReset();
    } else {
      window.location.reload();
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold text-foreground">
          Recapitulatif du devis
        </h2>
        <p className="text-sm text-muted-foreground">
          Vérifiez vos paramètres et calculez le prix
        </p>
      </div>

      {/* Preview by wizard step — two-column layout (label + value), steps separated */}
      <PreviewSections data={data} />

      {/* Acheteur: Fournisseurs à comparer */}
      {isAcheteur && allowedFournisseurs.length > 0 && (
        <div className="rounded-xl border bg-muted/40 p-4 space-y-3">
          <p className="text-sm font-medium">Fournisseurs à comparer</p>
          <div className="flex flex-wrap gap-3">
            {allowedFournisseurs.map((f) => (
              <label
                key={f.id}
                className="flex items-center gap-2 cursor-pointer text-sm"
              >
                <Checkbox
                  checked={selectedFournisseurIds.includes(f.id)}
                  onCheckedChange={() => toggleFournisseur(f.id)}
                />
                <span>{f.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Calculate button */}
      {!result && !(batchResult && batchResult.length > 0) && (
        <Button
          onClick={handleCalculate}
          disabled={isCalculating || (isAcheteur && selectedFournisseurIds.length === 0)}
          size="lg"
          className="w-full"
        >
          {isCalculating ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Calculator className="size-5" />
          )}
          {isCalculating ? "Calcul en cours…" : isAcheteur ? "Comparer les prix" : "Calculer le prix"}
        </Button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results — single (CLIENT / default) */}
      {result && !batchResult?.length && (
        <div className="space-y-4">
          {/* Full calculation variables — Superadmin & Fournisseur (Numérique + Offset; Entrées already shown above from snapshot) */}
          {(role === "SUPER_ADMIN" || role === "FOURNISSEUR") &&
            (result.calculationVariablesNumerique?.length ||
              result.calculationVariablesOffset?.length) && (
              <div className="space-y-4">
                {/* Numérique */}
                {result.calculationVariablesNumerique && result.calculationVariablesNumerique.length > 0 && (
                  <Card className="border-blue-200 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-blue-800 dark:text-blue-200">
                        Détail du calcul — Numérique
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <VariableList variables={result.calculationVariablesNumerique} />
                    </CardContent>
                  </Card>
                )}
                {/* Offset */}
                {result.calculationVariablesOffset && result.calculationVariablesOffset.length > 0 && (
                  <Card className="border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base font-medium text-emerald-800 dark:text-emerald-200">
                        Détail du calcul — Offset
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <VariableList variables={result.calculationVariablesOffset} />
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-4" />
            Calcul effectue — poids estime :{" "}
            {(result.weightPerCopyGrams / 1000).toFixed(3)} kg/ex.
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <PriceCard
              title="Numérique"
              total={result.digitalTotal}
              breakdown={result.digitalBreakdown}
              recommended={result.digitalTotal <= result.offsetTotal}
              selected={effectiveMethod === "digital"}
              onSelect={() => setSelectedMethod("digital")}
              methodKey="digital"
              selecting={null}
            />
            <PriceCard
              title="Offset"
              total={result.offsetTotal}
              breakdown={result.offsetBreakdown}
              recommended={result.offsetTotal < result.digitalTotal}
              selected={effectiveMethod === "offset"}
              onSelect={() => setSelectedMethod("offset")}
              methodKey="offset"
              selecting={null}
            />
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setSelectedMethod(null);
              setSaveState({ status: "idle" });
            }}
            className="w-full"
          >
            <RefreshCw className="size-4" />
            Recalculer
          </Button>

          {saveState.status === "saved" ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-4">
              <CheckCircle2 className="size-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Devis {saveState.quoteNumber} enregistré
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" asChild>
                  <a href={`/quotes/${saveState.quoteId}/print`}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    Aperçu PDF
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/quotes/${saveState.quoteId}`}>
                    Voir la fiche devis
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saveState.status === "saving"}
              className="w-full"
            >
              {saveState.status === "saving" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saveState.status === "saving"
                ? "Enregistrement…"
                : "Enregistrer le devis"}
            </Button>
          )}
        </div>
      )}

      {/* Results — batch (Acheteur) */}
      {batchResult && batchResult.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
            <CheckCircle2 className="size-4" />
            Comparaison effectuée — {batchResult.length} fournisseur(s)
          </div>
          {batchResult.map((r) => (
            <div key={r.fournisseurId} className="rounded-xl border p-4 space-y-3">
              <p className="font-medium">{r.fournisseurName}</p>
              <div className="grid gap-4 sm:grid-cols-2">
                <PriceCard
                  title="Numérique"
                  total={r.digitalTotal}
                  breakdown={r.digitalBreakdown}
                  recommended={r.digitalTotal <= r.offsetTotal}
                  methodKey="digital"
                  selecting={null}
                />
                <PriceCard
                  title="Offset"
                  total={r.offsetTotal}
                  breakdown={r.offsetBreakdown}
                  recommended={r.offsetTotal < r.digitalTotal}
                  methodKey="offset"
                  selecting={null}
                />
              </div>
            </div>
          ))}
          <Button
            variant="outline"
            onClick={() => {
              setBatchResult(null);
              setSaveState({ status: "idle" });
            }}
            className="w-full"
          >
            <RefreshCw className="size-4" />
            Recalculer
          </Button>
          {saveState.status === "saved" ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-4">
              <CheckCircle2 className="size-5 text-green-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Devis {saveState.quoteNumber} enregistré
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" asChild>
                  <a href={`/quotes/${saveState.quoteId}/print`}>
                    <FileText className="mr-1.5 h-4 w-4" />
                    Aperçu PDF
                  </a>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <a href={`/quotes/${saveState.quoteId}`}>
                    Voir la fiche devis
                  </a>
                </Button>
              </div>
            </div>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saveState.status === "saving"}
              className="w-full"
            >
              {saveState.status === "saving" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Save className="size-4" />
              )}
              {saveState.status === "saving"
                ? "Enregistrement…"
                : "Enregistrer le devis"}
            </Button>
          )}
        </div>
      )}

      <div className="flex justify-end pt-2">
        <Button variant="outline" onClick={handleReset}>
          <RefreshCw className="size-4" />
          Nouveau devis
        </Button>
      </div>
    </div>
  );
}
