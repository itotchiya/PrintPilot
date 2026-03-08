import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  // Allow both CLIENT and legacy ACHETEUR roles
  if (user.role !== "CLIENT" && user.role !== "ACHETEUR") {
    return NextResponse.json(
      { error: "Réservé aux Clients" },
      { status: 403 }
    );
  }

  const access = await prisma.supplierClientAccess.findMany({
    where: { clientId: user.id },
    include: { 
      supplier: { 
        select: { 
          id: true, 
          companyName: true,
          logoUrl: true,
          primaryColor: true,
        } 
      } 
    },
  });

  const suppliers = access.map((a) => ({
    id: a.supplier.id,
    name: a.supplier.companyName,
    logoUrl: a.supplier.logoUrl,
    primaryColor: a.supplier.primaryColor,
  }));

  return NextResponse.json({ suppliers });
}
