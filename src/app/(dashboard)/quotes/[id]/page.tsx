"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  CheckCircle2,
  Star,
  Loader2,
  Monitor,
  Layers,
} from "lucide-react";
import QuoteDetailHeader from "@/components/QuoteDetailHeader";
import { formatCurrency, formatDate } from "@/lib/utils";

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
type ProductType = "BROCHURE" | "DEPLIANT" | "FLYER" | "CARTE_DE_VISITE";

/** Display shape for the delivery points table */
interface DeliveryPointDisplay {
  name: string;
  department: string;
  quantity: number;
}

/** Stored shape from wizard (QuoteDeliveryPoint) */
interface StoredDeliveryPoint {
  departmentName?: string;
  departmentCode?: string;
  copies?: number;
  name?: string;
  address?: string;
  department?: string;
  quantity?: number;
}

interface Quote {
  id: string;
  quoteNumber: string;
  userId: string;
  status: QuoteStatus;
  productType: ProductType;
  quantity: number;
  formatName: string;
  formatWidth: string;
  formatHeight: string;
  openFormatWidth: string | null;
  openFormatHeight: string | null;
  pagesInterior: number | null;
  pagesCover: number | null;
  flapSize: string | null;
  paperInteriorType: string | null;
  paperInteriorGram: number | null;
  paperCoverType: string | null;
  paperCoverGram: number | null;
  colorModeInterior: string | null;
  colorModeCover: string | null;
  rectoVerso: boolean;
  bindingType: string | null;
  foldType: string | null;
  foldCount: number | null;
  secondaryFoldType: string | null;
  secondaryFoldCount: number | null;
  laminationMode: string | null;
  laminationFinish: string | null;
  packaging: unknown;
  deliveryPoints: unknown;
  digitalPrice: string | null;
  offsetPrice: string | null;
  digitalBreakdown: unknown;
  offsetBreakdown: unknown;
  deliveryCost: string | null;
  selectedMethod: string | null;
  weightPerCopy: string | null;
  totalWeight: string | null;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; name: string; email: string };
}

const PRODUCT_LABELS: Record<ProductType, string> = {
  BROCHURE: "Brochure",
  DEPLIANT: "Dépliant",
  FLYER: "Flyer",
  CARTE_DE_VISITE: "Carte de visite",
};

function SpecRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  if (value === null || value === undefined || value === "") return null;
  return (
    <div className="flex flex-col gap-0.5 py-1.5 sm:flex-row sm:items-baseline sm:gap-4">
      <span className="min-w-44 shrink-0 text-xs text-muted-foreground">
        {label}
      </span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

export default function QuoteDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [selectingMethod, setSelectingMethod] = useState<string | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const fetchQuote = async () => {
      try {
        const res = await fetch(`/api/quotes/${id}`);
        if (!res.ok) {
          const data = await res.json();
          setFetchError(data.error ?? "Devis introuvable");
          return;
        }
        setQuote(await res.json());
      } catch {
        setFetchError("Erreur lors du chargement du devis");
      } finally {
        setLoading(false);
      }
    };
    fetchQuote();
  }, [id]);

  const handleSelectMethod = async (method: string) => {
    setSelectingMethod(method);
    try {
      const res = await fetch(`/api/quotes/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selectedMethod: method }),
      });
      if (res.ok) {
        const updated = await res.json();
        setQuote((prev) =>
          prev ? { ...prev, selectedMethod: updated.selectedMethod } : prev
        );
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSelectingMethod(null);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotes/${id}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/quotes");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteOpen(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (fetchError || !quote) {
    return (
      <div className="mx-auto max-w-4xl">
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-10 text-center">
          <p className="text-sm font-medium text-destructive">
            {fetchError ?? "Devis introuvable"}
          </p>
          <Button variant="outline" className="mt-4" asChild>
            <Link href="/quotes">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Retour aux devis
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const digitalPrice =
    quote.digitalPrice != null ? parseFloat(quote.digitalPrice) : null;
  const offsetPrice =
    quote.offsetPrice != null ? parseFloat(quote.offsetPrice) : null;

  const isDigitalRecommended =
    digitalPrice != null &&
    offsetPrice != null &&
    digitalPrice <= offsetPrice;
  const isOffsetRecommended =
    offsetPrice != null &&
    digitalPrice != null &&
    offsetPrice < digitalPrice;

  // Normalize delivery points: wizard stores departmentName, departmentCode, copies
  const deliveryPoints: DeliveryPointDisplay[] = Array.isArray(quote.deliveryPoints)
    ? (quote.deliveryPoints as StoredDeliveryPoint[]).map((p) => ({
        name: p.departmentName ?? p.name ?? "—",
        department: p.departmentCode ?? p.department ?? "—",
        quantity: p.copies ?? p.quantity ?? 0,
      }))
    : [];
  const hasDeliveryPoints = deliveryPoints.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <QuoteDetailHeader
        quoteId={id}
        quoteNumber={quote.quoteNumber}
        status={quote.status}
        variant="detail"
        onDeleteClick={() => setDeleteOpen(true)}
      />

      <p className="text-xs text-muted-foreground">
        Créé le {formatDate(quote.createdAt)} · Mis à jour le{" "}
        {formatDate(quote.updatedAt)}
        {quote.user && (
          <> · {quote.user.name} ({quote.user.email})</>
        )}
      </p>

      {/* Price comparison */}
      {(digitalPrice != null || offsetPrice != null) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Digital */}
          <Card
            className={
              quote.selectedMethod === "digital"
                ? "border-primary ring-1 ring-primary"
                : ""
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Monitor className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">Numérique</CardTitle>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {isDigitalRecommended && (
                    <Badge className="bg-green-100 text-green-700 border-transparent dark:bg-green-900/30 dark:text-green-400">
                      <Star className="mr-1 h-3 w-3" />
                      Recommandé
                    </Badge>
                  )}
                  {quote.selectedMethod === "digital" && (
                    <Badge className="bg-primary/10 text-primary border-transparent">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Sélectionné
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {digitalPrice != null ? (
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(digitalPrice)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Non disponible</p>
              )}
              {digitalPrice != null && (
                <Button
                  variant={
                    quote.selectedMethod === "digital" ? "default" : "outline"
                  }
                  className="w-full"
                  disabled={selectingMethod !== null}
                  onClick={() => handleSelectMethod("digital")}
                >
                  {selectingMethod === "digital" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {quote.selectedMethod === "digital"
                    ? "Méthode sélectionnée"
                    : "Choisir cette méthode"}
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Offset */}
          <Card
            className={
              quote.selectedMethod === "offset"
                ? "border-primary ring-1 ring-primary"
                : ""
            }
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <Layers className="h-4 w-4 text-primary" />
                  </div>
                  <CardTitle className="text-base">Offset</CardTitle>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-1.5">
                  {isOffsetRecommended && (
                    <Badge className="bg-green-100 text-green-700 border-transparent dark:bg-green-900/30 dark:text-green-400">
                      <Star className="mr-1 h-3 w-3" />
                      Recommandé
                    </Badge>
                  )}
                  {quote.selectedMethod === "offset" && (
                    <Badge className="bg-primary/10 text-primary border-transparent">
                      <CheckCircle2 className="mr-1 h-3 w-3" />
                      Sélectionné
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {offsetPrice != null ? (
                <p className="text-3xl font-semibold tracking-tight tabular-nums">
                  {formatCurrency(offsetPrice)}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">Non disponible</p>
              )}
              {offsetPrice != null && (
                <Button
                  variant={
                    quote.selectedMethod === "offset" ? "default" : "outline"
                  }
                  className="w-full"
                  disabled={selectingMethod !== null}
                  onClick={() => handleSelectMethod("offset")}
                >
                  {selectingMethod === "offset" && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {quote.selectedMethod === "offset"
                    ? "Méthode sélectionnée"
                    : "Choisir cette méthode"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Specifications */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Spécifications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-x-8 sm:grid-cols-2">
            <div className="divide-y divide-border/60">
              <SpecRow
                label="Produit"
                value={PRODUCT_LABELS[quote.productType]}
              />
              <SpecRow
                label="Quantité"
                value={quote.quantity.toLocaleString("fr-FR")}
              />
              <SpecRow
                label="Format fermé"
                value={`${quote.formatName} — ${quote.formatWidth} × ${quote.formatHeight} cm`}
              />
              {quote.openFormatWidth && quote.openFormatHeight && (
                <SpecRow
                  label="Format ouvert"
                  value={`${quote.openFormatWidth} × ${quote.openFormatHeight} cm`}
                />
              )}
              {quote.pagesInterior != null && (
                <SpecRow
                  label="Pages intérieur"
                  value={String(quote.pagesInterior)}
                />
              )}
              {quote.pagesCover != null && (
                <SpecRow
                  label="Pages couverture"
                  value={String(quote.pagesCover)}
                />
              )}
              {quote.flapSize != null && (
                <SpecRow
                  label="Taille du rabat"
                  value={`${quote.flapSize} cm`}
                />
              )}
              {quote.paperInteriorType && (
                <SpecRow
                  label="Papier intérieur"
                  value={
                    quote.paperInteriorGram
                      ? `${quote.paperInteriorType} — ${quote.paperInteriorGram} g/m²`
                      : quote.paperInteriorType
                  }
                />
              )}
              {quote.paperCoverType && (
                <SpecRow
                  label="Papier couverture"
                  value={
                    quote.paperCoverGram
                      ? `${quote.paperCoverType} — ${quote.paperCoverGram} g/m²`
                      : quote.paperCoverType
                  }
                />
              )}
            </div>
            <div className="divide-y divide-border/60">
              {quote.colorModeInterior && (
                <SpecRow
                  label="Couleurs intérieur"
                  value={quote.colorModeInterior}
                />
              )}
              {quote.colorModeCover && (
                <SpecRow
                  label="Couleurs couverture"
                  value={quote.colorModeCover}
                />
              )}
              <SpecRow
                label="Recto-verso"
                value={quote.rectoVerso ? "Oui" : "Non"}
              />
              {quote.bindingType && (
                <SpecRow label="Reliure" value={quote.bindingType} />
              )}
              {quote.foldType && (
                <SpecRow
                  label="Type de pli"
                  value={
                    quote.foldCount
                      ? `${quote.foldType} (×${quote.foldCount})`
                      : quote.foldType
                  }
                />
              )}
              {quote.secondaryFoldType && (
                <SpecRow
                  label="Pli secondaire"
                  value={
                    quote.secondaryFoldCount
                      ? `${quote.secondaryFoldType} (×${quote.secondaryFoldCount})`
                      : quote.secondaryFoldType
                  }
                />
              )}
              {quote.laminationMode && (
                <SpecRow label="Mode pelliculage" value={quote.laminationMode} />
              )}
              {quote.laminationFinish && (
                <SpecRow
                  label="Finition pelliculage"
                  value={quote.laminationFinish}
                />
              )}
              {quote.deliveryCost != null && (
                <SpecRow
                  label="Frais de livraison"
                  value={formatCurrency(parseFloat(quote.deliveryCost))}
                />
              )}
              {quote.selectedMethod && (
                <SpecRow
                  label="Méthode choisie"
                  value={
                    quote.selectedMethod === "digital" ? "Numérique" : "Offset"
                  }
                />
              )}
              {quote.weightPerCopy != null && (
                <SpecRow
                  label="Poids / exemplaire"
                  value={`${quote.weightPerCopy} g`}
                />
              )}
              {quote.totalWeight != null && (
                <SpecRow
                  label="Poids total"
                  value={`${quote.totalWeight} kg`}
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delivery points */}
      {hasDeliveryPoints && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Points de livraison</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom / Adresse</TableHead>
                  <TableHead>Département</TableHead>
                  <TableHead className="text-right">Quantité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {deliveryPoints.map((point, i) => (
                  <TableRow key={i}>
                    <TableCell className="text-sm font-medium">
                      {point.name}
                    </TableCell>
                    <TableCell className="text-sm">
                      {point.department}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {point.quantity.toLocaleString("fr-FR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le devis</DialogTitle>
            <DialogDescription>
              Vous êtes sur le point de supprimer le devis{" "}
              <strong className="font-semibold">{quote.quoteNumber}</strong>.
              Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Supprimer définitivement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
