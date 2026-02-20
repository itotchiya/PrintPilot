import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  const adminRoles = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN", "FOURNISSEUR"];
  if (role && adminRoles.includes(role)) {
    redirect("/admin");
  }

  redirect("/quotes");
}
