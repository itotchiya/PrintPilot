import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Users,
  Plus,
  Search,
  Mail,
  Calendar,
  ArrowRight,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

async function getClients(supplierId: string) {
  const clients = await prisma.supplierClientAccess.findMany({
    where: { supplierId },
    orderBy: { invitedAt: 'desc' },
    include: {
      client: {
        select: {
          id: true,
          name: true,
          email: true,
          createdAt: true,
        },
      },
    },
  });

  // Get quote counts for each client
  const clientsWithStats = await Promise.all(
    clients.map(async (access) => {
      const quoteCount = await prisma.quote.count({
        where: {
          userId: access.clientId,
        },
      });

      const pdfDownloads = await prisma.quote.count({
        where: {
          userId: access.clientId,
          pdfDownloaded: true,
        },
      });

      return {
        ...access,
        quoteCount,
        pdfDownloads,
      };
    })
  );

  return clientsWithStats;
}

export default async function SupplierClientsPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Get supplier profile
  const supplierProfile = await prisma.supplierProfile.findUnique({
    where: { userId: session.user.id },
  });

  if (!supplierProfile) {
    redirect('/dashboard');
  }

  const clients = await getClients(supplierProfile.id);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes clients</h1>
          <p className="text-sm text-muted-foreground">
            Gérez les clients qui peuvent générer des devis avec vos tarifs
          </p>
        </div>
        <Button asChild>
          <Link href="/supplier/clients/invite">
            <Plus className="mr-2 h-4 w-4" />
            Inviter un client
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total clients</span>
            </div>
            <p className="text-2xl font-bold mt-2">{clients.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total devis</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {clients.reduce((acc, c) => acc + c.quoteCount, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Téléchargements PDF</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {clients.reduce((acc, c) => acc + c.pdfDownloads, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Liste des clients</CardTitle>
              <CardDescription>Tous vos clients invités</CardDescription>
            </div>
            <div className="relative w-64">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search clients..." className="pl-10" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {clients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">Aucun client pour l&apos;instant</h3>
              <p className="text-muted-foreground mb-4">
                Invitez votre premier client pour commencer à générer des devis
              </p>
              <Button asChild>
                <Link href="/supplier/clients/invite">
                  <Plus className="mr-2 h-4 w-4" />
                  Inviter mon premier client
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Invité le</TableHead>
                  <TableHead>Devis</TableHead>
                  <TableHead>Téléchargements PDF</TableHead>
                  <TableHead className="w-[100px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((access) => (
                  <TableRow key={access.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-bold">
                            {access.client.name?.charAt(0).toUpperCase() || 'C'}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{access.client.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {access.client.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {new Date(access.invitedAt).toLocaleDateString()}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground ring-1 ring-border">
                        {access.quoteCount}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-foreground ring-1 ring-border">
                        {access.pdfDownloads}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/supplier/clients/${access.clientId}`}>
                          Voir
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
