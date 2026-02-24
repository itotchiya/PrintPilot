import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, markFournisseurConfigCustomized } from "../_helpers";

export async function GET() {
  try {
    const divisors = await prisma.formatClickDivisor.findMany({
      orderBy: { formatName: "asc" },
    });
    return NextResponse.json(divisors);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const body = await request.json();
    const divisor = await prisma.formatClickDivisor.create({ data: body });
    if (user?.role === "FOURNISSEUR" && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(divisor, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) return NextResponse.json({ error: "Le champ 'id' est requis" }, { status: 400 });
    const divisor = await prisma.formatClickDivisor.update({ where: { id }, data });
    if (user?.role === "FOURNISSEUR" && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(divisor);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Le paramètre 'id' est requis" }, { status: 400 });
    await prisma.formatClickDivisor.delete({ where: { id } });
    if (user?.role === "FOURNISSEUR" && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
