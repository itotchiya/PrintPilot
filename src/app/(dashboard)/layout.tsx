import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { DashboardHeader } from "@/components/layout/DashboardHeader";
import { AdminSidebar } from "@/components/layout/AdminSidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;
  const useAdminSidebar =
    role === "SUPER_ADMIN" ||
    role === "FOURNISSEUR" ||
    role === "ACHETEUR" ||
    role === "ADMIN" ||
    role === "EMPLOYEE";

  // SuperAdmin, Fournisseur, Acheteur (and legacy Admin/Employee) see the same sidebar layout
  if (useAdminSidebar) {
    return (
      <div className="flex min-h-screen bg-muted/30">
        <AdminSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden px-4 py-6 md:px-8">
          {children}
        </main>
      </div>
    );
  }

  // Clients see the top header
  return (
    <div className="flex min-h-screen flex-col">
      <DashboardHeader />
      <main className="flex-1 min-w-0 px-4 py-6 md:px-6 lg:px-8">
        {children}
      </main>
    </div>
  );
}
