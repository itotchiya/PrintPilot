"use client";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { StepProps } from "../WizardContainer";
import type { DigitalBreakdown } from "@/lib/pricing/digital";
import type { OffsetBreakdown } from "@/lib/pricing/offset";

interface PricingResult {
  digitalTotal: number;
  offsetTotal: number;
  digitalBreakdown: DigitalBreakdown;
  offsetBreakdown: OffsetBreakdown;
  deliveryCost: number;
  weightPerCopyGrams: number;
  currency: "EUR";
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
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<"digital" | "offset" | null>(null);
  const [saveState, setSaveState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    quoteId?: string;
    quoteNumber?: string;
  }>({ status: "idle" });

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
    try {
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.group("[PrintPilot Wizard] Calcul — entrée");
        console.log("Payload envoyé à /api/pricing/calculate:", JSON.parse(JSON.stringify(data)));
        console.groupEnd();
      }
      const res = await fetch("/api/pricing/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Erreur de calcul");
      if (json.status === "pending") {
        setError("Moteur de calcul en cours d implementation.");
        return;
      }
      const resultData = json as PricingResult;
      if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
        console.group("[PrintPilot Wizard] Calcul — résultat");
        console.log("Digital total:", resultData.digitalTotal);
        console.log("Offset total:", resultData.offsetTotal);
        console.log("Livraison:", resultData.deliveryCost);
        console.log("Poids/ex. (g):", resultData.weightPerCopyGrams);
        console.log("Détail digital:", resultData.digitalBreakdown);
        console.log("Détail offset:", resultData.offsetBreakdown);
        console.log("Réponse complète:", resultData);
        console.groupEnd();
      }
      setResult(resultData);
      setSelectedMethod(
        resultData.digitalTotal <= resultData.offsetTotal ? "digital" : "offset"
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsCalculating(false);
    }
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!result) return;
    const methodToSave = effectiveMethod ?? (result.digitalTotal <= result.offsetTotal ? "digital" : "offset");
    setSaveState({ status: "saving" });
    try {
      const res = await fetch("/api/quotes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          digitalTotal: result.digitalTotal,
          offsetTotal: result.offsetTotal,
          digitalBreakdown: result.digitalBreakdown,
          offsetBreakdown: result.offsetBreakdown,
          deliveryCost: result.deliveryCost,
          weightPerCopyGrams: result.weightPerCopyGrams,
          selectedMethod: methodToSave,
        }),
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
  }, [data, result, effectiveMethod]);

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
          Verifiez vos parametres et calculez le prix
        </p>
      </div>

      {/* Full spec summary — all parameters from the wizard */}
      <div className="rounded-xl border bg-muted/40 p-4 space-y-4 text-sm">
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Produit & format
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Produit : </span>
              <span className="font-medium">
                {PRODUCT_LABELS[data.productType ?? ""] ?? "—"}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Quantité : </span>
              <span className="font-medium">
                {data.quantity.toLocaleString("fr-FR")}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Format : </span>
              <span className="font-medium">
                {data.format
                  ? `${data.format.widthCm} × ${data.format.heightCm} cm`
                  : "—"}
              </span>
            </div>
            {data.pagesInterior != null && data.pagesInterior > 0 && (
              <div>
                <span className="text-muted-foreground">Pages int. : </span>
                <span className="font-medium">{data.pagesInterior}</span>
              </div>
            )}
            {data.productType === "BROCHURE" && data.pagesCover > 0 && (
              <div>
                <span className="text-muted-foreground">Pages couv. : </span>
                <span className="font-medium">{data.pagesCover}</span>
              </div>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Papier
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {(data.paperInteriorGrammage != null && data.paperInteriorGrammage > 0) && (
              <div>
                <span className="text-muted-foreground">Intérieur : </span>
                <span className="font-medium">{data.paperInteriorGrammage} g/m²</span>
              </div>
            )}
            {(data.paperCoverGrammage != null && data.paperCoverGrammage > 0) && (
              <div>
                <span className="text-muted-foreground">Couverture : </span>
                <span className="font-medium">{data.paperCoverGrammage} g/m²</span>
              </div>
            )}
            {(!data.paperInteriorGrammage || data.paperInteriorGrammage <= 0) &&
             (!data.paperCoverGrammage || data.paperCoverGrammage <= 0) && (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Couleurs
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            <div>
              <span className="text-muted-foreground">Recto verso : </span>
              <span className="font-medium">{data.rectoVerso ? "Oui" : "Non"}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Finitions
          </p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-3">
            {data.bindingTypeId && (
              <div>
                <span className="text-muted-foreground">Reliure : </span>
                <span className="font-medium">Oui</span>
              </div>
            )}
            {(data.foldTypeId || data.foldCount > 0) && (
              <div>
                <span className="text-muted-foreground">Pliage : </span>
                <span className="font-medium">
                  {data.secondaryFoldType === "Pli Croise" && data.secondaryFoldCount > 0
                    ? `${data.foldCount} + ${data.secondaryFoldCount} pli croisé`
                    : `${data.foldCount} pli(s)`}
                </span>
              </div>
            )}
            <div>
              <span className="text-muted-foreground">Pelliculage : </span>
              <span className="font-medium">{data.laminationMode}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Conditionnement
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {data.packaging.cartons && (
              <span className="font-medium">Cartons</span>
            )}
            {data.packaging.film && (
              <span className="font-medium">Film</span>
            )}
            {data.packaging.elastiques && (
              <span className="font-medium">Élastiques</span>
            )}
            {data.packaging.crystalBoxQty > 0 && (
              <span className="font-medium">
                Coffrets : {data.packaging.crystalBoxQty}
              </span>
            )}
            {!data.packaging.cartons && !data.packaging.film &&
             !data.packaging.elastiques && data.packaging.crystalBoxQty === 0 && (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Livraison
          </p>
          <div className="space-y-1">
            {data.deliveryPoints
              .filter((p) => p.copies > 0 && (p.departmentName || p.departmentCode))
              .map((p, i) => (
                <div key={i} className="flex flex-wrap items-baseline gap-x-2">
                  <span className="font-medium">
                    {p.departmentName || p.departmentCode || "Département"}
                  </span>
                  <span className="text-muted-foreground">
                    — {p.copies.toLocaleString("fr-FR")} ex.
                    {p.zone > 0 && ` · Zone ${p.zone}`}
                    {p.hayon && " · Hayon"}
                  </span>
                </div>
              ))}
            {data.deliveryPoints.every(
              (p) => p.copies <= 0 || (!p.departmentName && !p.departmentCode)
            ) && (
              <span className="text-muted-foreground">—</span>
            )}
          </div>
        </div>
      </div>

      {/* Calculate button */}
      {!result && (
        <Button
          onClick={handleCalculate}
          disabled={isCalculating}
          size="lg"
          className="w-full"
        >
          {isCalculating ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Calculator className="size-5" />
          )}
          {isCalculating ? "Calcul en cours…" : "Calculer le prix"}
        </Button>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-4">
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

          {/* Save / recalculate */}
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

          {/* Save quote button / success banner */}
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
