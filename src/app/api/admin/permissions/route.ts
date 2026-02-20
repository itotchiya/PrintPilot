import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const acheteurs = await prisma.user.findMany({
    where: { role: "ACHETEUR" },
    select: {
      id: true,
      name: true,
      email: true,
      acheteurAccess: {
        select: {
          fournisseurId: true,
          fournisseur: { select: { id: true, name: true } },
        },
      },
    },
  });

  const fournisseurs = await prisma.user.findMany({
    where: { role: "FOURNISSEUR" },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({
    acheteurs: acheteurs.map((a) => ({
      id: a.id,
      name: a.name,
      email: a.email,
      fournisseurIds: a.acheteurAccess.map((x) => x.fournisseurId),
      fournisseurs: a.acheteurAccess.map((x) => ({ id: x.fournisseur.id, name: x.fournisseur.name })),
    })),
    fournisseurs,
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { acheteurId, fournisseurId } = body as { acheteurId?: string; fournisseurId?: string };
  if (!acheteurId || !fournisseurId) {
    return NextResponse.json(
      { error: "acheteurId et fournisseurId requis" },
      { status: 400 }
    );
  }

  const created = await prisma.acheteurFournisseurAccess.create({
    data: { acheteurId, fournisseurId },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const acheteurId = searchParams.get("acheteurId");
  const fournisseurId = searchParams.get("fournisseurId");
  if (!acheteurId || !fournisseurId) {
    return NextResponse.json(
      { error: "Paramètres acheteurId et fournisseurId requis" },
      { status: 400 }
    );
  }

  await prisma.acheteurFournisseurAccess.deleteMany({
    where: { acheteurId, fournisseurId },
  });
  return new NextResponse(null, { status: 204 });
}
