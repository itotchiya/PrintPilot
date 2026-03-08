"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  PlusCircle, 
  Loader2,
  ArrowRight,
  Mail,
  Globe,
  MapPin,
  Phone,
  FileText
} from "lucide-react";

interface Supplier {
  id: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  address?: string;
  phone?: string;
  website?: string;
  quoteCount: number;
  lastQuoteDate?: string;
}

export default function ClientSuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const response = await fetch("/api/client/suppliers");
      if (!response.ok) throw new Error("Failed to fetch suppliers");
      const data = await response.json();
      setSuppliers(data.suppliers || []);
    } catch (err) {
      console.error("Failed to load suppliers:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">My Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            All printing suppliers you can generate quotes from
          </p>
        </div>
        {suppliers.length > 0 && (
          <Button asChild className="bg-green-600 hover:bg-green-700">
            <Link href="/client/quotes/new">
              <PlusCircle className="mr-2 h-4 w-4" />
              New Quote
            </Link>
          </Button>
        )}
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {suppliers.map((supplier) => (
            <Card key={supplier.id} className="flex flex-col">
              <CardHeader>
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
                      <CardDescription>Connected supplier</CardDescription>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                {/* Contact Info */}
                <div className="space-y-2 mb-4">
                  {supplier.address && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <MapPin className="h-4 w-4 shrink-0" />
                      <span className="truncate">{supplier.address}</span>
                    </div>
                  )}
                  {supplier.phone && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0" />
                      <span>{supplier.phone}</span>
                    </div>
                  )}
                  {supplier.website && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Globe className="h-4 w-4 shrink-0" />
                      <a 
                        href={supplier.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="hover:underline truncate"
                      >
                        {supplier.website}
                      </a>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 py-4 border-t">
                  <div className="text-center">
                    <p className="text-2xl font-bold">{supplier.quoteCount}</p>
                    <p className="text-xs text-muted-foreground">Quotes Generated</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      {supplier.lastQuoteDate 
                        ? new Date(supplier.lastQuoteDate).toLocaleDateString()
                        : 'Never'
                      }
                    </p>
                    <p className="text-xs text-muted-foreground">Last Quote</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 space-y-2">
                  <Button className="w-full" asChild>
                    <Link href={`/client/quotes/new?supplier=${supplier.id}`}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Get Quote
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Info Card */}
      {suppliers.length > 0 && (
        <Card className="bg-muted/50 border">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Want to add more suppliers?</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Ask your printing suppliers to invite you to PrintQuote. Each supplier 
                  you&apos;re connected with will appear here, and you can compare their prices 
                  side-by-side when generating quotes.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
