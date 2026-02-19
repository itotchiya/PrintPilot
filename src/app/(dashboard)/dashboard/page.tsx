import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  const role = (session?.user as { role?: string } | undefined)?.role;

  if (role === "ADMIN" || role === "EMPLOYEE") {
    redirect("/admin");
  }

  redirect("/quotes");
}
