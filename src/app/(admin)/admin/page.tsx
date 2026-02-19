import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  FileText,
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  PlusCircle,
  Settings,
  ArrowRight,
  Ruler,
  Layers,
  Truck,
  Cpu,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

async function getStats() {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const [
    totalQuotes,
    quotesToday,
    quotesThisMonth,
    draftCount,
    sentCount,
    acceptedCount,
    rejectedCount,
    recentQuotes,
  ] = await Promise.all([
    prisma.quote.count(),
    prisma.quote.count({ where: { createdAt: { gte: startOfToday } } }),
    prisma.quote.count({ where: { createdAt: { gte: startOfMonth } } }),
    prisma.quote.count({ where: { status: "DRAFT" } }),
    prisma.quote.count({ where: { status: "SENT" } }),
    prisma.quote.count({ where: { status: "ACCEPTED" } }),
    prisma.quote.count({ where: { status: "REJECTED" } }),
    prisma.quote.findMany({
      take: 8,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true, email: true } } },
    }),
  ]);

  return {
    totalQuotes,
    quotesToday,
    quotesThisMonth,
    draftCount,
    sentCount,
    acceptedCount,
    rejectedCount,
    recentQuotes,
  };
}

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
};

const STATUS_CLASSES: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  SENT: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  ACCEPTED: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  REJECTED: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  EXPIRED: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
};

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

const quickConfigLinks = [
  { label: "Formats", href: "/admin/config/formats", icon: Ruler, desc: "Dimensions prédéfinies" },
  { label: "Pelliculage", href: "/admin/config/lamination", icon: Layers, desc: "Finitions & tarifs" },
  { label: "Livraison", href: "/admin/config/delivery", icon: Truck, desc: "Zones & transporteurs" },
  { label: "Coûts Numérique", href: "/admin/config/digital", icon: Cpu, desc: "Clics & mise en route" },
];

export default async function AdminHomePage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  if (!role || (role !== "ADMIN" && role !== "EMPLOYEE")) redirect("/quotes");

  const stats = await getStats();

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="text-sm text-muted-foreground">
            Vue d&apos;ensemble de l&apos;activité PrintPilot
          </p>
        </div>
        <Button asChild>
          <Link href="/dashboard/new">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nouveau devis
          </Link>
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total devis
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalQuotes}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.quotesToday} aujourd&apos;hui
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ce mois-ci
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.quotesThisMonth}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Devis créés en {new Date().toLocaleDateString("fr-FR", { month: "long" })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              En attente
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.draftCount + stats.sentCount}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {stats.draftCount} brouillons · {stats.sentCount} envoyés
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Acceptés / Refusés
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">{stats.acceptedCount}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <XCircle className="h-3 w-3 text-red-500" />
              {stats.rejectedCount} refusés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Recent quotes + Quick config */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent quotes — takes 2/3 of the width */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Devis récents</CardTitle>
              <CardDescription>Les 8 derniers devis créés</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/admin/quotes" className="text-xs">
                Voir tout
                <ArrowRight className="ml-1 h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">N° Devis</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Produit</TableHead>
                    <TableHead className="text-right">Numérique</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.recentQuotes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                        Aucun devis pour le moment
                      </TableCell>
                    </TableRow>
                  ) : (
                    stats.recentQuotes.map((q) => (
                      <TableRow key={q.id} className="hover:bg-muted/50">
                        <TableCell className="pl-6">
                          <Link
                            href={`/quotes/${q.id}`}
                            className="font-mono text-xs font-medium text-primary hover:underline"
                          >
                            {q.quoteNumber}
                          </Link>
                          <p className="text-xs text-muted-foreground">{formatDate(q.createdAt)}</p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{q.user.name}</p>
                          <p className="text-xs text-muted-foreground">{q.user.email}</p>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={PRODUCT_CLASSES[q.productType] ?? ""}
                          >
                            {PRODUCT_LABELS[q.productType] ?? q.productType}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {q.digitalPrice
                            ? formatCurrency(Number(q.digitalPrice))
                            : <span className="text-muted-foreground">—</span>}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={STATUS_CLASSES[q.status] ?? ""}
                          >
                            {STATUS_LABELS[q.status] ?? q.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Quick access — takes 1/3 */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Configuration rapide</CardTitle>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/admin/config" className="text-xs">
                    Tout voir
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
              <CardDescription>Accès direct aux paramètres clés</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {quickConfigLinks.map((item) => (
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
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Moteur de calcul</CardTitle>
              </div>
              <CardDescription>Tous les paramètres de tarification</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full" variant="outline">
                <Link href="/admin/config">
                  <Settings className="mr-2 h-4 w-4" />
                  Ouvrir la configuration
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
