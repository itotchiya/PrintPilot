import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  // New 3-tier role system redirects
  switch (role) {
    case "SUPER_ADMIN":
      // Super Admin goes to admin dashboard
      redirect("/admin/dashboard");
      break;
    
    case "SUPPLIER":
    case "FOURNISSEUR":
      // Supplier goes to supplier dashboard
      redirect("/supplier/dashboard");
      break;
    
    case "CLIENT":
    case "ACHETEUR":
      // Client goes to client dashboard
      redirect("/client/dashboard");
      break;
    
    // Legacy roles - redirect to appropriate dashboards
    case "ADMIN":
    case "EMPLOYEE":
      redirect("/admin/dashboard");
      break;
    
    default:
      // Fallback for unknown roles
      redirect("/login");
  }
}
