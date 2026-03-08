"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  FileText, 
  TrendingDown,
  ArrowRight,
  Zap,
  PlusCircle
} from "lucide-react";

interface Supplier {
  id: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  quoteCount: number;
}

interface RecentQuote {
  id: string;
  productType: string;
  quantity: number;
  format: string;
  supplierCount: number;
  bestPrice: number;
  createdAt: string;
}

const PRODUCT_LABELS: Record<string, string> = {
  BROCHURE: "Brochure",
  DEPLIANT: "Flyer",
  FLYER: "Flyer",
  CARTE_DE_VISITE: "Business Card",
};

const PRODUCT_CLASSES: Record<string, string> = {
  BROCHURE: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
  DEPLIANT: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  FLYER: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  CARTE_DE_VISITE: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
};

export default function ClientDashboardPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [suppliersRes, quotesRes] = await Promise.all([
          fetch("/api/client/suppliers"),
          fetch("/api/client/quotes"),
        ]);

        if (suppliersRes.ok) {
          const suppliersData = await suppliersRes.json();
          setSuppliers(suppliersData.suppliers || []);
        }

        if (quotesRes.ok) {
          const quotesData = await quotesRes.json();
          setRecentQuotes((quotesData.quotes || []).slice(0, 5));
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Generate quotes from your connected printing suppliers
          </p>
        </div>
        <Button asChild className="bg-green-600 hover:bg-green-700">
          <Link href="/client/quotes/new">
            <Zap className="mr-2 h-4 w-4" />
            Quote from All Suppliers
          </Link>
        </Button>
      </div>

      {/* Suppliers Grid */}
      {suppliers.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">No Suppliers Yet</h2>
            <p className="text-muted-foreground max-w-md mx-auto mb-6">
              You haven&apos;t been invited by any suppliers yet. Once a supplier invites you, 
              you&apos;ll see them here and be able to generate instant quotes.
            </p>
            <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Instant quotes</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>Price comparison</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-green-500" />
                <span>PDF downloads</span>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="h-12 w-12 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: supplier.primaryColor || '#3B8BEB' }}
                    >
                      {supplier.logoUrl ? (
                        <img 
                          src={supplier.logoUrl} 
                          alt={supplier.companyName}
                          className="h-10 w-10 object-contain"
                        />
                      ) : (
                        <span className="text-lg font-bold text-white">
                          {supplier.companyName.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{supplier.companyName}</CardTitle>
                      <CardDescription>{supplier.quoteCount} quotes generated</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0 mt-auto">
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" asChild>
                    <Link href={`/client/quotes/new?supplier=${supplier.id}`}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Get Quote
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/client/suppliers`}>
                      View
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Recent Quotes Section */}
      {recentQuotes.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Recent Quotes</h2>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/client/quotes" className="text-xs">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </div>

          <div className="grid gap-4">
            {recentQuotes.map((quote) => (
              <Card key={quote.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={PRODUCT_CLASSES[quote.productType] || ""}>
                            {PRODUCT_LABELS[quote.productType] || quote.productType}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {quote.quantity} copies · {quote.format}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {new Date(quote.createdAt).toLocaleDateString()} · {quote.supplierCount} suppliers
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2 mb-1">
                        <TrendingDown className="h-4 w-4 text-green-600" />
                        <span className="text-sm text-muted-foreground">Best price</span>
                      </div>
                      <p className="text-2xl font-bold text-green-600">
                        ${quote.bestPrice?.toFixed(2) || "—"}
                      </p>
                      <Button variant="ghost" size="sm" className="mt-2" asChild>
                        <Link href={`/client/quotes/compare?id=${quote.id}`}>
                          View Comparison
                          <ArrowRight className="ml-1 h-3 w-3" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
