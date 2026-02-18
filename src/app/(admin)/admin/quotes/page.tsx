"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Search,
  ChevronDown,
  Trash2,
  Eye,
  Loader2,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
type ProductType = "BROCHURE" | "DEPLIANT" | "FLYER" | "CARTE_DE_VISITE";

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  productType: ProductType;
  quantity: number;
  formatName: string;
  digitalPrice: number | null;
  offsetPrice: number | null;
  selectedMethod: string | null;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

// ─── Constants ───────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
};

const PRODUCT_LABELS: Record<ProductType, string> = {
  BROCHURE: "Brochure",
  DEPLIANT: "Dépliant",
  FLYER: "Flyer / Poster",
  CARTE_DE_VISITE: "Carte de visite",
};

const ALL_STATUSES: QuoteStatus[] = [
  "DRAFT",
  "SENT",
  "ACCEPTED",
  "REJECTED",
  "EXPIRED",
];
const ALL_PRODUCTS: ProductType[] = [
  "BROCHURE",
  "DEPLIANT",
  "FLYER",
  "CARTE_DE_VISITE",
];

// ─── Status badge ─────────────────────────────────────────────────────────────

function statusBadgeClass(status: QuoteStatus): string {
  switch (status) {
    case "DRAFT":
      return "bg-secondary text-secondary-foreground";
    case "SENT":
      return "bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300";
    case "ACCEPTED":
      return "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-300";
    case "REJECTED":
      return "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300";
    case "EXPIRED":
      return "bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300";
  }
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | QuoteStatus>("ALL");
  const [productFilter, setProductFilter] = useState<"ALL" | ProductType>(
    "ALL"
  );

  // For status update in-flight tracking
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Quote | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/quotes?limit=500");
      if (!res.ok) throw new Error("Impossible de charger les devis");
      const data = await res.json();
      setQuotes((data.quotes ?? data) as Quote[]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchQuotes();
  }, [fetchQuotes]);

  // ── Filter logic ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return quotes.filter((quote) => {
      const matchSearch =
        !q ||
        quote.quoteNumber.toLowerCase().includes(q) ||
        quote.user.name.toLowerCase().includes(q) ||
        quote.user.email.toLowerCase().includes(q);
      const matchStatus =
        statusFilter === "ALL" || quote.status === statusFilter;
      const matchProduct =
        productFilter === "ALL" || quote.productType === productFilter;
      return matchSearch && matchStatus && matchProduct;
    });
  }, [quotes, search, statusFilter, productFilter]);

  // ── Status update ─────────────────────────────────────────────────────────
  const handleStatusChange = useCallback(
    async (quote: Quote, newStatus: QuoteStatus) => {
      if (quote.status === newStatus) return;
      setUpdatingId(quote.id);
      try {
        const res = await fetch(`/api/quotes/${quote.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
        if (!res.ok) {
          const json = await res.json();
          throw new Error(json.error);
        }
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === quote.id ? { ...q, status: newStatus } : q
          )
        );
        toast.success(
          `Devis ${quote.quoteNumber} → ${STATUS_LABELS[newStatus]}`
        );
      } catch (e) {
        toast.error(
          e instanceof Error ? e.message : "Erreur lors de la mise à jour"
        );
      } finally {
        setUpdatingId(null);
      }
    },
    []
  );

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotes/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error);
      }
      setQuotes((prev) => prev.filter((q) => q.id !== deleteTarget.id));
      toast.success(`Devis ${deleteTarget.quoteNumber} supprimé`);
      setDeleteTarget(null);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Erreur lors de la suppression"
      );
    } finally {
      setDeleting(false);
    }
  }, [deleteTarget]);

  // ── Price column ──────────────────────────────────────────────────────────
  function getPrice(quote: Quote): string {
    if (quote.selectedMethod === "digital" && quote.digitalPrice != null) {
      return formatCurrency(quote.digitalPrice);
    }
    if (quote.selectedMethod === "offset" && quote.offsetPrice != null) {
      return formatCurrency(quote.offsetPrice);
    }
    if (quote.digitalPrice != null) return formatCurrency(quote.digitalPrice);
    if (quote.offsetPrice != null) return formatCurrency(quote.offsetPrice);
    return "—";
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-semibold tracking-tight">
                Tous les devis
              </h1>
              {!loading && (
                <Badge variant="secondary" className="text-xs tabular-nums">
                  {filtered.length}
                  {filtered.length !== quotes.length &&
                    ` / ${quotes.length}`}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Gestion de tous les devis clients
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher par N° devis ou client…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 w-full"
            />
          </div>
          <div className="flex gap-3">
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as "ALL" | QuoteStatus)
              }
            >
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les statuts</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={productFilter}
              onValueChange={(v) =>
                setProductFilter(v as "ALL" | ProductType)
              }
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Produit" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Tous les produits</SelectItem>
                {ALL_PRODUCTS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PRODUCT_LABELS[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div className="rounded-xl border bg-card shadow-sm overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-20 gap-3 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Chargement…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2 text-muted-foreground">
              <FileText className="h-10 w-10 opacity-30" />
              <p className="text-sm font-medium">Aucun devis trouvé</p>
              {(search || statusFilter !== "ALL" || productFilter !== "ALL") && (
                <p className="text-xs">
                  Essayez de modifier vos filtres de recherche
                </p>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-36">N° Devis</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead className="w-28">Date</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead className="w-24 text-right">Quantité</TableHead>
                  <TableHead className="w-28 text-right">Numérique</TableHead>
                  <TableHead className="w-28 text-right">Offset</TableHead>
                  <TableHead className="w-32">Statut</TableHead>
                  <TableHead className="w-20 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((quote) => (
                  <TableRow key={quote.id}>
                    {/* N° Devis */}
                    <TableCell className="font-mono text-xs font-medium">
                      {quote.quoteNumber}
                    </TableCell>

                    {/* Client */}
                    <TableCell>
                      <div className="leading-tight">
                        <p className="text-sm font-medium">{quote.user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {quote.user.email}
                        </p>
                      </div>
                    </TableCell>

                    {/* Date */}
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(quote.createdAt)}
                    </TableCell>

                    {/* Produit */}
                    <TableCell className="text-sm">
                      {PRODUCT_LABELS[quote.productType]}
                    </TableCell>

                    {/* Quantité */}
                    <TableCell className="text-right text-sm tabular-nums">
                      {quote.quantity.toLocaleString("fr-FR")}
                    </TableCell>

                    {/* Prix numérique */}
                    <TableCell className="text-right text-sm tabular-nums">
                      {quote.digitalPrice != null
                        ? formatCurrency(quote.digitalPrice)
                        : "—"}
                    </TableCell>

                    {/* Prix offset */}
                    <TableCell className="text-right text-sm tabular-nums">
                      {quote.offsetPrice != null
                        ? formatCurrency(quote.offsetPrice)
                        : "—"}
                    </TableCell>

                    {/* Statut — dropdown */}
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium transition-opacity ${statusBadgeClass(quote.status)} ${updatingId === quote.id ? "opacity-50 cursor-wait" : "cursor-pointer hover:opacity-80"}`}
                            disabled={updatingId === quote.id}
                          >
                            {updatingId === quote.id ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : null}
                            {STATUS_LABELS[quote.status]}
                            <ChevronDown className="size-3 opacity-60" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-40">
                          <DropdownMenuLabel className="text-xs text-muted-foreground">
                            Changer le statut
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {ALL_STATUSES.map((s) => (
                            <DropdownMenuItem
                              key={s}
                              onClick={() => handleStatusChange(quote, s)}
                              className={
                                quote.status === s
                                  ? "font-medium text-primary"
                                  : ""
                              }
                            >
                              {STATUS_LABELS[s]}
                              {quote.status === s && (
                                <span className="ml-auto text-primary">✓</span>
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>

                    {/* Actions */}
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          asChild
                        >
                          <Link href={`/quotes/${quote.id}/print`}>
                            <Eye className="h-3.5 w-3.5" />
                            <span className="sr-only">Voir</span>
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget(quote)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span className="sr-only">Supprimer</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le devis ?</DialogTitle>
            <DialogDescription>
              Le devis{" "}
              <span className="font-mono font-medium">
                {deleteTarget?.quoteNumber}
              </span>{" "}
              de{" "}
              <span className="font-medium">{deleteTarget?.user.name}</span>{" "}
              sera définitivement supprimé. Cette action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
