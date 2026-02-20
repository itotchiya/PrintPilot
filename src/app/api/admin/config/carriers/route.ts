import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, markFournisseurConfigCustomized } from "../_helpers";

function getScope(request: NextRequest, role: string | undefined, userId: string | undefined): string | null {
  if (!role || !userId) return null;
  if (role === "FOURNISSEUR" || role === "ADMIN" || role === "EMPLOYEE") return userId;
  if (role === "SUPER_ADMIN") {
    const { searchParams } = new URL(request.url);
    return searchParams.get("fournisseurId") ?? null;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const scope = getScope(request, user?.role, user?.id);
  try {
    const carriers = await prisma.carrier.findMany({
      where: { fournisseurId: scope ?? null },
      include: { deliveryRates: { orderBy: { zone: "asc" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(carriers);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const scope = getScope(request, user?.role, user?.id);
  try {
    const body = await request.json();
    const carrier = await prisma.carrier.create({
      data: { ...body, fournisseurId: scope },
    });
    if (user?.role === "FOURNISSEUR" && scope === user?.id && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(carrier, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const scope = getScope(request, user?.role, user?.id);
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json(
        { error: "Le champ 'id' est requis" },
        { status: 400 }
      );
    }
    const carrier = await prisma.carrier.update({
      where: { id, fournisseurId: scope ?? null },
      data,
    });
    if (user?.role === "FOURNISSEUR" && scope === user?.id && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(carrier);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "")) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }
  const scope = getScope(request, user?.role, user?.id);
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Paramètre id requis" },
      { status: 400 }
    );
  }
  try {
    await prisma.carrier.delete({ where: { id, fournisseurId: scope ?? null } });
    if (user?.role === "FOURNISSEUR" && scope === user?.id && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
