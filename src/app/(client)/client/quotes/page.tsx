"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  PlusCircle, 
  Loader2,
  TrendingDown,
  ArrowRight,
  Calendar,
  Building2
} from "lucide-react";

interface Quote {
  id: string;
  productType: string;
  specifications: {
    quantity: number;
    format: string;
  };
  multiSupplierResults: Record<string, {
    totalPrice: number;
    unitPrice: number;
  }>;
  status: string;
  createdAt: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  BROCHURE: "Brochure",
  DEPLIANT: "Dépliant",
  FLYER: "Flyer",
  CARTE_DE_VISITE: "Carte de visite",
};

const PRODUCT_CLASSES: Record<string, string> = {
  BROCHURE: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  DEPLIANT: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  FLYER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CARTE_DE_VISITE: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

export default function ClientQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchQuotes();
  }, []);

  const fetchQuotes = async () => {
    try {
      const response = await fetch("/api/client/quotes");
      if (!response.ok) throw new Error("Failed to fetch quotes");
      const data = await response.json();
      setQuotes(data.quotes || []);
    } catch (err) {
      console.error("Failed to load quotes:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const getBestPrice = (results: Quote["multiSupplierResults"]) => {
    if (!results || Object.keys(results).length === 0) return 0;
    const prices = Object.values(results).map((r) => r.totalPrice);
    return Math.min(...prices);
  };

  const getSupplierCount = (results: Quote["multiSupplierResults"]) => {
    if (!results) return 0;
    return Object.keys(results).length;
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes devis</h1>
          <p className="text-sm text-muted-foreground">
            Consultez et comparez vos devis générés
          </p>
        </div>
        <Button asChild className="bg-green-600 hover:bg-green-700">
          <Link href="/client/quotes/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau devis
          </Link>
        </Button>
      </div>

      {/* Quotes List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : quotes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">Aucun devis pour l&apos;instant</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              Générez votre premier devis pour comparer les prix entre plusieurs fournisseurs.
            </p>
            <Button asChild className="bg-green-600 hover:bg-green-700">
              <Link href="/client/quotes/new">
                <PlusCircle className="mr-2 h-4 w-4" />
                Générer un devis
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {quotes.map((quote) => (
            <Card key={quote.id} className="hover:border-primary/50 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold text-lg">
                          {PRODUCT_LABELS[quote.productType] || quote.productType}
                        </h3>
                        <Badge variant="outline" className={PRODUCT_CLASSES[quote.productType] || ""}>
                          {quote.productType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(quote.createdAt).toLocaleDateString()}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-4 w-4" />
                          {getSupplierCount(quote.multiSupplierResults)} fournisseur{getSupplierCount(quote.multiSupplierResults) > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {quote.specifications?.quantity} copies · {quote.specifications?.format}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2 mb-1 justify-end">
                      <TrendingDown className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">Meilleur prix</span>
                    </div>
                    <p className="text-3xl font-bold text-green-600">
                      ${getBestPrice(quote.multiSupplierResults).toFixed(2)}
                    </p>
                    <Button variant="outline" size="sm" className="mt-3" asChild>
                      <Link href={`/client/quotes/compare?id=${quote.id}`}>
                        Voir la comparaison
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
