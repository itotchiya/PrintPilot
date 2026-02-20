import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { calculatePricing } from "@/lib/pricing/engine";
import type { QuoteInput } from "@/lib/pricing/types";

export async function POST(request: NextRequest) {
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

  try {
    const body = (await request.json()) as {
      quoteInput: QuoteInput;
      fournisseurIds: string[];
    };
    const { quoteInput, fournisseurIds } = body;

    if (!quoteInput?.productType || !quoteInput?.quantity || quoteInput.quantity <= 0) {
      return NextResponse.json(
        { error: "Donnees incompletes : quoteInput (type de produit, quantite) requis" },
        { status: 400 }
      );
    }
    if (!Array.isArray(fournisseurIds) || fournisseurIds.length === 0) {
      return NextResponse.json(
        { error: "fournisseurIds (tableau non vide) requis" },
        { status: 400 }
      );
    }

    const allowed = await prisma.acheteurFournisseurAccess.findMany({
      where: { acheteurId: user.id, fournisseurId: { in: fournisseurIds } },
      select: { fournisseurId: true },
    });
    const allowedIds = new Set(allowed.map((a) => a.fournisseurId));
    const toRun = fournisseurIds.filter((id) => allowedIds.has(id));
    if (toRun.length === 0) {
      return NextResponse.json(
        { error: "Aucun Fournisseur autorisé dans la liste" },
        { status: 403 }
      );
    }

    const fournisseurs = await prisma.user.findMany({
      where: { id: { in: toRun }, role: "FOURNISSEUR" },
      select: { id: true, name: true },
    });
    const nameById = Object.fromEntries(fournisseurs.map((u) => [u.id, u.name]));

    const results: Array<{
      fournisseurId: string;
      fournisseurName: string;
      digitalTotal: number;
      offsetTotal: number;
      digitalBreakdown: unknown;
      offsetBreakdown: unknown;
      deliveryCost: number;
      weightPerCopyGrams: number;
    }> = [];

    for (const fid of toRun) {
      const result = await calculatePricing(quoteInput, fid);
      results.push({
        fournisseurId: fid,
        fournisseurName: nameById[fid] ?? fid,
        digitalTotal: result.digitalTotal,
        offsetTotal: result.offsetTotal,
        digitalBreakdown: result.digitalBreakdown,
        offsetBreakdown: result.offsetBreakdown,
        deliveryCost: result.deliveryCost,
        weightPerCopyGrams: result.weightPerCopyGrams,
      });
    }

    return NextResponse.json({ status: "ok", results });
  } catch (error) {
    console.error("Pricing batch error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de calcul" },
      { status: 500 }
    );
  }
}
