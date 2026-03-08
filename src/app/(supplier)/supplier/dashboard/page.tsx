"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  FileText, 
  Download, 
  TrendingUp, 
  PlusCircle,
  Settings,
  Palette,
  ArrowRight,
  Building2,
  CheckCircle2
} from "lucide-react";

interface DashboardStats {
  totalClients: number;
  totalQuotes: number;
  pdfDownloads: number;
  conversionRate: string;
}

interface RecentQuote {
  id: string;
  quoteNumber: string;
  productType: string;
  quantity: number;
  clientName: string;
  totalPrice: number;
  createdAt: string;
  pdfDownloaded: boolean;
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

export default function SupplierDashboardPage() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalClients: 0,
    totalQuotes: 0,
    pdfDownloads: 0,
    conversionRate: "0%",
  });
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch dashboard data
    const fetchData = async () => {
      try {
        const response = await fetch("/api/supplier/dashboard");
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setRecentQuotes(data.recentQuotes || []);
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  const quickActionLinks = [
    { label: "My Clients", href: "/supplier/clients", icon: Users, desc: "Manage your client relationships" },
    { label: "Update Pricing", href: "/supplier/config", icon: Settings, desc: "Configure your pricing rules" },
    { label: "Customize Branding", href: "/supplier/branding", icon: Palette, desc: "Personalize your PDF quotes" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of your activity and client quotes
          </p>
        </div>
        <Button asChild>
          <Link href="/supplier/clients/invite">
            <PlusCircle className="mr-2 h-4 w-4" />
            Invite Client
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Clients
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{isLoading ? "—" : stats.totalClients}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Active relationships
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Quotes Generated
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{isLoading ? "—" : stats.totalQuotes}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Total quotes created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PDF Downloads
            </CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{isLoading ? "—" : stats.pdfDownloads}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Quotes downloaded
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Conversion Rate
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {isLoading ? "—" : stats.conversionRate}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Downloads / Quotes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Quotes */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent Quotes</CardTitle>
              <CardDescription>Latest quotes generated by your clients</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/quotes" className="text-xs">
                View All
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recentQuotes.length === 0 ? (
              <div className="py-10 text-center">
                <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">No quotes yet</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Quotes will appear here when clients generate them
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentQuotes.map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{quote.clientName}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge variant="outline" className={PRODUCT_CLASSES[quote.productType] || ""}>
                            {PRODUCT_LABELS[quote.productType] || quote.productType}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {quote.quantity} copies
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${quote.totalPrice?.toFixed(2) || "—"}</p>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        {quote.pdfDownloaded ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                            <span className="text-xs text-muted-foreground">Downloaded</span>
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Generated</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Manage your supplier account</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {quickActionLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/30 hover:bg-accent"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium leading-none">{item.label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{item.desc}</p>
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Tips for Success</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground">Keep your pricing up to date for accurate quotes</p>
              </div>
              <div className="flex gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground">Customize your branding for professional PDFs</p>
              </div>
              <div className="flex gap-2 text-sm">
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                <p className="text-muted-foreground">Respond quickly when clients download quotes</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
