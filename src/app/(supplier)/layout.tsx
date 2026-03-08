import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { AdminSidebar } from '@/components/layout/AdminSidebar';

export default async function SupplierLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect('/login');
  }

  // Check if user is a supplier (SUPPLIER, FOURNISSEUR, or SUPER_ADMIN)
  const allowedRoles = ['SUPPLIER', 'FOURNISSEUR', 'SUPER_ADMIN'];
  if (!allowedRoles.includes(session.user.role)) {
    redirect('/dashboard');
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <AdminSidebar />
      <main className="flex-1 min-w-0 overflow-x-hidden px-4 py-6 md:px-8">
        {children}
      </main>
    </div>
  );
}
