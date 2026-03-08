import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Settings,
  UserPlus,
  PauseCircle,
  PlayCircle,
  FileText,
  ArrowRight,
  Mail,
  Users,
} from 'lucide-react';
import Link from 'next/link';

async function getSuppliers(search?: string, status?: string) {
  const where: any = {};

  if (search) {
    where.OR = [
      { companyName: { contains: search, mode: 'insensitive' } },
      { user: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  if (status && status !== 'all') {
    where.subscriptionStatus = status.toUpperCase();
  }

  const suppliers = await prisma.supplierProfile.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { name: true, email: true, createdAt: true },
      },
      _count: {
        select: { clients: true },
      },
    },
  });

  // Get quote counts for each supplier
  const suppliersWithQuotes = await Promise.all(
    suppliers.map(async (supplier) => {
      const quoteCount = await prisma.quote.count({
        where: {
          selectedSupplierId: supplier.id,
        },
      });
      return { ...supplier, quoteCount };
    })
  );

  return suppliersWithQuotes;
}

interface SuppliersPageProps {
  searchParams: Promise<{ search?: string; status?: string }>;
}

export default async function SuppliersPage({ searchParams }: SuppliersPageProps) {
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== 'SUPER_ADMIN') {
    redirect('/dashboard');
  }

  const resolvedParams = await searchParams;
  const suppliers = await getSuppliers(resolvedParams.search, resolvedParams.status);

  const getStatusBadge = (status: string, isActive: boolean) => {
    if (!isActive) {
      return <Badge variant="destructive">Suspended</Badge>;
    }
    switch (status) {
      case 'ACTIVE':
        return <Badge variant="default">Active</Badge>;
      case 'TRIAL':
        return <Badge variant="secondary">Trial</Badge>;
      case 'PENDING':
        return <Badge variant="outline">Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getOnboardingBadge = (step: string) => {
    switch (step) {
      case 'COMPLETE':
        return <Badge variant="default" className="bg-green-500">Complete</Badge>;
      case 'INVITED':
        return <Badge variant="outline">Invited</Badge>;
      case 'ACCOUNT_CREATED':
        return <Badge variant="secondary">Account Created</Badge>;
      case 'CONFIG_STARTED':
        return <Badge variant="secondary">Config Started</Badge>;
      default:
        return <Badge variant="outline">{step.replace(/_/g, ' ')}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>
          <p className="text-sm text-muted-foreground">
            Manage all printing suppliers on the platform
          </p>
        </div>
        <Button asChild>
          <Link href="/admin/suppliers/invite">
            <Plus className="mr-2 h-4 w-4" />
            Invite Supplier
          </Link>
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <form>
                <Input
                  name="search"
                  placeholder="Search suppliers..."
                  className="pl-10"
                  defaultValue={resolvedParams.search}
                />
              </form>
            </div>
            <div className="flex gap-2">
              <Button
                variant={resolvedParams.status === 'all' || !resolvedParams.status ? 'default' : 'outline'}
                size="sm"
                asChild
              >
                <Link href="/admin/suppliers">All</Link>
              </Button>
              <Button
                variant={resolvedParams.status === 'active' ? 'default' : 'outline'}
                size="sm"
                asChild
              >
                <Link href="/admin/suppliers?status=active">Active</Link>
              </Button>
              <Button
                variant={resolvedParams.status === 'trial' ? 'default' : 'outline'}
                size="sm"
                asChild
              >
                <Link href="/admin/suppliers?status=trial">Trial</Link>
              </Button>
              <Button
                variant={resolvedParams.status === 'suspended' ? 'default' : 'outline'}
                size="sm"
                asChild
              >
                <Link href="/admin/suppliers?status=suspended">Suspended</Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Suppliers ({suppliers.length})</CardTitle>
          <CardDescription>
            Click on a supplier to view details or manage their account
          </CardDescription>
        </CardHeader>
        <CardContent>
          {suppliers.length === 0 ? (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">No suppliers yet</h3>
              <p className="text-muted-foreground mb-4">
                Get started by inviting your first supplier
              </p>
              <Button asChild>
                <Link href="/admin/suppliers/invite">
                  <Plus className="mr-2 h-4 w-4" />
                  Invite Supplier
                </Link>
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Onboarding</TableHead>
                  <TableHead>Clients</TableHead>
                  <TableHead>Quotes</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          {supplier.logoUrl ? (
                            <img
                              src={supplier.logoUrl}
                              alt={supplier.companyName}
                              className="h-8 w-8 object-contain"
                            />
                          ) : (
                            <span className="text-sm font-bold text-primary">
                              {supplier.companyName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{supplier.companyName}</p>
                          <p className="text-sm text-muted-foreground">
                            {supplier.user.email}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusBadge(supplier.subscriptionStatus, supplier.isActive)}
                    </TableCell>
                    <TableCell>
                      {getOnboardingBadge(supplier.onboardingStep)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier._count.clients}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span>{supplier.quoteCount || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(supplier.createdAt).toLocaleDateString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/suppliers/${supplier.id}`}>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              View Details
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/suppliers/${supplier.id}/config`}>
                              <Settings className="mr-2 h-4 w-4" />
                              Configure Pricing
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/suppliers/${supplier.id}/clients`}>
                              <UserPlus className="mr-2 h-4 w-4" />
                              View Clients
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {supplier.isActive ? (
                            <DropdownMenuItem className="text-destructive">
                              <PauseCircle className="mr-2 h-4 w-4" />
                              Suspend Account
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem>
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Reactivate Account
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Suppliers</span>
            </div>
            <p className="text-2xl font-bold mt-2">{suppliers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Clients</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {suppliers.reduce((acc, s) => acc + s._count.clients, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Pending Invites</span>
            </div>
            <p className="text-2xl font-bold mt-2">-</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total Quotes</span>
            </div>
            <p className="text-2xl font-bold mt-2">
              {suppliers.reduce((acc, s) => acc + (s.quoteCount || 0), 0)}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
