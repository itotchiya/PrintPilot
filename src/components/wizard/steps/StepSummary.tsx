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
}: {
  title: string;
  total: number;
  breakdown: DigitalBreakdown | OffsetBreakdown;
  recommended?: boolean;
}) {
  const isDigital = "clickCostInterior" in breakdown;
  return (
    <Card className={recommended ? "border-primary shadow-md" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          {recommended && (
            <Badge className="bg-primary/15 text-primary text-xs">
              Recommande
            </Badge>
          )}
        </div>
        <p className="text-3xl font-bold text-foreground tabular-nums">
          {formatCurrency(total)}
        </p>
      </CardHeader>
      <CardContent className="space-y-1">
        <Separator className="mb-3" />
        {isDigital ? (
          <>
            <BreakdownRow
              label="Clics interieur"
              value={(breakdown as DigitalBreakdown).clickCostInterior}
            />
            <BreakdownRow
              label="Clics couverture"
              value={(breakdown as DigitalBreakdown).clickCostCover}
            />
            <BreakdownRow
              label="Papier interieur"
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
              label="Papier interieur"
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
        <BreakdownRow label="Reliure / Faconnage" value={breakdown.bindingCost} />
        <BreakdownRow label="Pelliculage" value={breakdown.laminationCost} />
        <BreakdownRow label="Livraison" value={breakdown.deliveryCost} />
        <Separator className="my-2" />
        <div className="flex justify-between text-sm font-semibold">
          <span>Total HT</span>
          <span className="tabular-nums">{formatCurrency(total)}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function StepSummary({ data, onNext, onReset }: StepProps) {
  void onNext;
  const [isCalculating, setIsCalculating] = useState(false);
  const [result, setResult] = useState<PricingResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<{
    status: "idle" | "saving" | "saved" | "error";
    quoteId?: string;
    quoteNumber?: string;
  }>({ status: "idle" });

  const handleCalculate = useCallback(async () => {
    setIsCalculating(true);
    setError(null);
    setSaveState({ status: "idle" });
    try {
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
      setResult(json as PricingResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erreur inconnue");
    } finally {
      setIsCalculating(false);
    }
  }, [data]);

  const handleSave = useCallback(async () => {
    if (!result) return;
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
          selectedMethod:
            result.digitalTotal <= result.offsetTotal ? "digital" : "offset",
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
  }, [data, result]);

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

      {/* Quick spec summary */}
      <div className="rounded-xl border bg-muted/40 p-4 space-y-2 text-sm">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div>
            <span className="text-muted-foreground">Produit : </span>
            <span className="font-medium">
              {PRODUCT_LABELS[data.productType ?? ""] ?? "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Quantite : </span>
            <span className="font-medium">
              {data.quantity.toLocaleString("fr-FR")}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Format : </span>
            <span className="font-medium">
              {data.format
                ? `${data.format.widthCm}x${data.format.heightCm} cm`
                : "—"}
            </span>
          </div>
          {data.pagesInterior && (
            <div>
              <span className="text-muted-foreground">Pages int. : </span>
              <span className="font-medium">{data.pagesInterior}</span>
            </div>
          )}
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
              title="Impression Numerique"
              total={result.digitalTotal}
              breakdown={result.digitalBreakdown}
              recommended={result.digitalTotal <= result.offsetTotal}
            />
            <PriceCard
              title="Impression Offset"
              total={result.offsetTotal}
              breakdown={result.offsetBreakdown}
              recommended={result.offsetTotal < result.digitalTotal}
            />
          </div>

          {/* Save / recalculate */}
          <Button
            variant="outline"
            onClick={() => {
              setResult(null);
              setSaveState({ status: "idle" });
            }}
            className="w-full"
          >
            <RefreshCw className="size-4" />
            Recalculer
          </Button>

          {/* Save quote button / success banner */}
          {saveState.status === "saved" ? (
            <div className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 dark:bg-green-950/20 p-4">
              <CheckCircle2 className="size-5 text-green-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800 dark:text-green-300">
                  Devis {saveState.quoteNumber} enregistré
                </p>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={`/quotes/${saveState.quoteId}/print`}>
                  Voir le devis
                </a>
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleSave}
              disabled={saveState.status === "saving"}
              variant="outline"
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
