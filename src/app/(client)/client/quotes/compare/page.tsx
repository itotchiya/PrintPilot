'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Download, 
  FileText,
  CheckCircle2,
  TrendingDown,
  Clock,
  DollarSign,
  ArrowLeft,
  Building2,
} from 'lucide-react';

interface QuoteResult {
  totalPrice: number;
  unitPrice: number;
  breakdown: Array<{ label: string; amount: number }>;
  turnaround: string;
}

interface SupplierQuote {
  supplierId: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  quote: QuoteResult;
}

interface QuoteData {
  id: string;
  productType: string;
  specifications: {
    quantity: number;
    format: string;
    pages: number;
    colorMode: string;
    binding?: string;
    lamination?: string;
  };
  multiSupplierResults: Record<string, QuoteResult>;
}

const PRODUCT_LABELS: Record<string, string> = {
  BROCHURE: 'Brochure',
  DEPLIANT: 'Flyer',
  FLYER: 'Flyer',
  CARTE_DE_VISITE: 'Business Card',
};

export default function CompareQuotesPage() {
  const searchParams = useSearchParams();
  const quoteId = searchParams.get('id');
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteData | null>(null);
  const [suppliers, setSuppliers] = useState<SupplierQuote[]>([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (quoteId) {
      fetchQuote();
    } else {
      setIsLoading(false);
      setError('No quote ID provided');
    }
  }, [quoteId]);

  const fetchQuote = async () => {
    try {
      const response = await fetch(`/api/client/quotes/${quoteId}`);
      if (!response.ok) throw new Error('Failed to fetch quote');
      const data = await response.json();
      setQuote(data.quote);
      setSuppliers(data.suppliers);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quote');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadPdf = async (supplierId: string) => {
    setIsGeneratingPdf(supplierId);
    try {
      const response = await fetch(`/api/client/quotes/${quoteId}/pdf?supplier=${supplierId}`);
      if (!response.ok) throw new Error('Failed to generate PDF');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `quote-${supplierId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate PDF');
    } finally {
      setIsGeneratingPdf(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="max-w-2xl mx-auto">
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <p className="text-destructive mb-4">{error || 'Quote not found'}</p>
            <Button variant="outline" asChild>
              <Link href="/client/quotes">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quotes
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Sort suppliers by total price
  const sortedSuppliers = [...suppliers].sort(
    (a, b) => a.quote.totalPrice - b.quote.totalPrice
  );
  const cheapest = sortedSuppliers[0];
  const savings = sortedSuppliers.length > 1 
    ? sortedSuppliers[sortedSuppliers.length - 1].quote.totalPrice - cheapest.quote.totalPrice 
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Button variant="outline" size="sm" asChild className="mb-4">
            <Link href="/client/quotes">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold tracking-tight">Quote Comparison</h1>
          <p className="text-sm text-muted-foreground">
            Compare prices from {suppliers.length} suppliers
          </p>
        </div>
        <Badge variant="outline" className="text-sm self-start">
          Generated {new Date().toLocaleDateString()}
        </Badge>
      </div>

      {/* Job Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Job Specifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Product</p>
              <p className="font-medium">{PRODUCT_LABELS[quote.productType] || quote.productType}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Quantity</p>
              <p className="font-medium">{quote.specifications.quantity} copies</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Format</p>
              <p className="font-medium">{quote.specifications.format}</p>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase">Pages</p>
              <p className="font-medium">{quote.specifications.pages}</p>
            </div>
            {quote.specifications.binding && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Binding</p>
                <p className="font-medium">{quote.specifications.binding}</p>
              </div>
            )}
            {quote.specifications.lamination && (
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground uppercase">Lamination</p>
                <p className="font-medium">{quote.specifications.lamination}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Comparison */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight">Price Comparison</h2>
        
        {sortedSuppliers.map((supplier, index) => (
          <Card 
            key={supplier.supplierId}
            className={index === 0 ? 'border-emerald-500/30 bg-emerald-500/10' : ''}
          >
            <CardContent className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                {/* Supplier Info */}
                <div className="flex items-start gap-4 flex-1">
                  <div 
                    className="h-14 w-14 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: supplier.primaryColor || '#3B8BEB' }}
                  >
                    {supplier.logoUrl ? (
                      <img 
                        src={supplier.logoUrl} 
                        alt={supplier.companyName}
                        className="h-10 w-10 object-contain"
                      />
                    ) : (
                      <span className="text-xl font-bold text-white">
                        {supplier.companyName.charAt(0).toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{supplier.companyName}</h3>
                      {index === 0 && (
                        <Badge className="bg-green-600 hover:bg-green-600">
                          <TrendingDown className="h-3 w-3 mr-1" />
                          Best Price
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      {supplier.quote.turnaround}
                    </div>
                  </div>
                </div>

                {/* Pricing */}
                <div className="text-right lg:min-w-[200px]">
                  <p className="text-3xl font-bold text-green-600">
                    ${supplier.quote.totalPrice.toFixed(2)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    ${supplier.quote.unitPrice.toFixed(3)} per unit
                  </p>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Button
                    variant={index === 0 ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => handleDownloadPdf(supplier.supplierId)}
                    disabled={isGeneratingPdf === supplier.supplierId}
                  >
                    {isGeneratingPdf === supplier.supplierId ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4 mr-2" />
                    )}
                    Download PDF
                  </Button>
                </div>
              </div>

              {/* Breakdown */}
              <div className="mt-6 pt-6 border-t">
                <p className="text-sm font-medium mb-3">Price Breakdown</p>
                <div className="space-y-2">
                  {supplier.quote.breakdown.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={item.amount < 0 ? 'text-green-600' : ''}>
                        {item.amount < 0 ? '-' : ''}
                        ${Math.abs(item.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Savings Summary */}
      {savings > 0 && (
        <Card className="bg-muted/50 border">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">
                  Potential Savings
                </h3>
                <p className="text-muted-foreground mt-1">
                  By choosing {cheapest.companyName}, you could save{' '}
                  <span className="font-bold">${savings.toFixed(2)}</span>
                  {' '}compared to the most expensive option.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
