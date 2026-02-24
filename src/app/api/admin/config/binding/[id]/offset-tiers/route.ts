import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, markFournisseurConfigCustomized } from "../../../_helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const tiers = await prisma.bindingPriceTierOffset.findMany({
      where: { bindingTypeId: id },
      orderBy: { cahiersCount: "asc" },
    });
    return NextResponse.json(tiers);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const tier = await prisma.bindingPriceTierOffset.create({
      data: { ...body, bindingTypeId: id },
    });
    const bt = await prisma.bindingType.findUnique({ where: { id }, select: { fournisseurId: true } });
    if (user?.role === "FOURNISSEUR" && user?.id && bt?.fournisseurId === user.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  try {
    const body = await request.json();
    const { id: tierId, ...data } = body;
    if (!tierId) {
      return NextResponse.json({ error: "Le champ 'id' est requis" }, { status: 400 });
    }
    const tier = await prisma.bindingPriceTierOffset.update({
      where: { id: tierId },
      data,
    });
    const bt = await prisma.bindingType.findUnique({ where: { id }, select: { fournisseurId: true } });
    if (user?.role === "FOURNISSEUR" && user?.id && bt?.fournisseurId === user.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(tier);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  try {
    const { searchParams } = new URL(request.url);
    const tierId = searchParams.get("id");
    if (!tierId) {
      return NextResponse.json({ error: "Le paramètre 'id' est requis" }, { status: 400 });
    }
    await prisma.bindingPriceTierOffset.delete({ where: { id: tierId } });
    const bt = await prisma.bindingType.findUnique({ where: { id }, select: { fournisseurId: true } });
    if (user?.role === "FOURNISSEUR" && user?.id && bt?.fournisseurId === user.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
