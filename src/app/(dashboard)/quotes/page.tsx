"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PlusCircle,
  FileText,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED";
type ProductType = "BROCHURE" | "DEPLIANT" | "FLYER" | "CARTE_DE_VISITE";

interface Quote {
  id: string;
  quoteNumber: string;
  status: QuoteStatus;
  productType: ProductType;
  formatName: string;
  formatWidth: string;
  formatHeight: string;
  quantity: number;
  digitalPrice: string | null;
  offsetPrice: string | null;
  createdAt: string;
}

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
};

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: "bg-secondary text-secondary-foreground border-transparent",
  SENT: "bg-blue-100 text-blue-700 border-transparent dark:bg-blue-900/30 dark:text-blue-400",
  ACCEPTED:
    "bg-green-100 text-green-700 border-transparent dark:bg-green-900/30 dark:text-green-400",
  REJECTED:
    "bg-red-100 text-red-700 border-transparent dark:bg-red-900/30 dark:text-red-400",
  EXPIRED:
    "bg-orange-100 text-orange-700 border-transparent dark:bg-orange-900/30 dark:text-orange-400",
};

const PRODUCT_LABELS: Record<ProductType, string> = {
  BROCHURE: "Brochure",
  DEPLIANT: "Dépliant",
  FLYER: "Flyer",
  CARTE_DE_VISITE: "Carte de visite",
};

const PRODUCT_CLASSES: Record<ProductType, string> = {
  BROCHURE:
    "bg-purple-100 text-purple-700 border-transparent dark:bg-purple-900/30 dark:text-purple-400",
  DEPLIANT:
    "bg-cyan-100 text-cyan-700 border-transparent dark:bg-cyan-900/30 dark:text-cyan-400",
  FLYER:
    "bg-amber-100 text-amber-700 border-transparent dark:bg-amber-900/30 dark:text-amber-400",
  CARTE_DE_VISITE:
    "bg-pink-100 text-pink-700 border-transparent dark:bg-pink-900/30 dark:text-pink-400",
};

export default function QuotesPage() {
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [productFilter, setProductFilter] = useState<string>("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  useEffect(() => {
    const fetchQuotes = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (statusFilter !== "all") params.set("status", statusFilter);
        if (productFilter !== "all") params.set("productType", productFilter);

        const res = await fetch(`/api/quotes?${params}`);
        if (!res.ok) throw new Error("Erreur lors de la récupération");
        const data = await res.json();
        setQuotes(data.quotes);
        setTotal(data.total);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchQuotes();
  }, [page, statusFilter, productFilter]);

  const handleFilterChange = (type: "status" | "product", value: string) => {
    setPage(1);
    if (type === "status") setStatusFilter(value);
    else setProductFilter(value);
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/quotes/${deleteId}`, { method: "DELETE" });
      if (res.ok) {
        setQuotes((prev) => prev.filter((q) => q.id !== deleteId));
        setTotal((prev) => prev - 1);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes devis</h1>
          <p className="text-sm text-muted-foreground">
            {total > 0
              ? `${total} devis au total`
              : "Gérez vos devis d'impression"}
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau devis
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select
          value={statusFilter}
          onValueChange={(v) => handleFilterChange("status", v)}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="DRAFT">Brouillon</SelectItem>
            <SelectItem value="SENT">Envoyé</SelectItem>
            <SelectItem value="ACCEPTED">Accepté</SelectItem>
            <SelectItem value="REJECTED">Refusé</SelectItem>
            <SelectItem value="EXPIRED">Expiré</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={productFilter}
          onValueChange={(v) => handleFilterChange("product", v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Produit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les produits</SelectItem>
            <SelectItem value="BROCHURE">Brochure</SelectItem>
            <SelectItem value="DEPLIANT">Dépliant</SelectItem>
            <SelectItem value="FLYER">Flyer</SelectItem>
            <SelectItem value="CARTE_DE_VISITE">Carte de visite</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : quotes.length === 0 ? (
        <Card>
          <CardHeader className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <FileText className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-lg">Aucun devis trouvé</CardTitle>
            <CardDescription>
              {statusFilter !== "all" || productFilter !== "all"
                ? "Aucun devis ne correspond aux filtres sélectionnés."
                : "Créez votre premier devis en cliquant sur le bouton ci-dessus."}
            </CardDescription>
          </CardHeader>
          {statusFilter === "all" && productFilter === "all" && (
            <CardContent className="flex justify-center pb-8">
              <Button asChild variant="outline">
                <Link href="/dashboard/new">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Créer un devis
                </Link>
              </Button>
            </CardContent>
          )}
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">N° Devis</TableHead>
                  <TableHead className="whitespace-nowrap">Date</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Quantité
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Prix Numérique
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    Prix Offset
                  </TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {quote.quoteNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                      {formatDate(quote.createdAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={PRODUCT_CLASSES[quote.productType]}>
                        {PRODUCT_LABELS[quote.productType]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">
                      <span className="font-medium">{quote.formatName}</span>
                      <span className="text-muted-foreground">
                        {" "}
                        {quote.formatWidth}×{quote.formatHeight} cm
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {quote.quantity.toLocaleString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {quote.digitalPrice != null
                        ? formatCurrency(parseFloat(quote.digitalPrice))
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm tabular-nums">
                      {quote.offsetPrice != null
                        ? formatCurrency(parseFloat(quote.offsetPrice))
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_CLASSES[quote.status]}>
                        {STATUS_LABELS[quote.status]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => router.push(`/quotes/${quote.id}`)}
                          title="Voir le devis"
                        >
                          <Eye className="h-4 w-4" />
                          <span className="sr-only">Voir</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => setDeleteId(quote.id)}
                          title="Supprimer le devis"
                        >
                          <Trash2 className="h-4 w-4" />
                          <span className="sr-only">Supprimer</span>
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3">
              <p className="text-xs text-muted-foreground">
                Page {page} sur {totalPages} —{" "}
                {total.toLocaleString("fr-FR")} résultats
              </p>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Page précédente</span>
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                  <span className="sr-only">Page suivante</span>
                </Button>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le devis</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Le devis sera définitivement
              supprimé.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteId(null)}
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
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
