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
  if (user.role !== "ACHETEUR") {
    return NextResponse.json(
      { error: "Réservé aux Acheteurs" },
      { status: 403 }
    );
  }

  const access = await prisma.acheteurFournisseurAccess.findMany({
    where: { acheteurId: user.id },
    include: { fournisseur: { select: { id: true, name: true } } },
  });

  const fournisseurs = access.map((a) => ({
    id: a.fournisseur.id,
    name: a.fournisseur.name,
  }));

  return NextResponse.json({ fournisseurs });
}
