import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, markFournisseurConfigCustomized } from "../../../_helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id: carrierId } = await params;
  const { searchParams } = new URL(request.url);
  const deptCode = searchParams.get("dept");

  try {
    const rates = await prisma.transportRateByDept.findMany({
      where: {
        carrierId,
        ...(deptCode ? { departmentCode: { contains: deptCode } } : {}),
      },
      orderBy: [{ departmentCode: "asc" }, { maxWeightKg: "asc" }],
      take: 500,
    });
    return NextResponse.json(rates);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: carrierId } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const body = await request.json();
    const rate = await prisma.transportRateByDept.create({
      data: { ...body, carrierId },
    });
    const carrier = await prisma.carrier.findUnique({ where: { id: carrierId }, select: { fournisseurId: true } });
    if (user?.role === "FOURNISSEUR" && user?.id && carrier?.fournisseurId === user.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: carrierId } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const body = await request.json();
    const { id: rateId, ...data } = body;
    if (!rateId) return NextResponse.json({ error: "Le champ 'id' est requis" }, { status: 400 });
    const rate = await prisma.transportRateByDept.updateMany({
      where: { id: rateId, carrierId },
      data,
    });
    if (rate.count === 0) {
      return NextResponse.json({ error: "Tarif introuvable" }, { status: 404 });
    }
    const updated = await prisma.transportRateByDept.findUnique({ where: { id: rateId } });
    const carrier = await prisma.carrier.findUnique({ where: { id: carrierId }, select: { fournisseurId: true } });
    if (user?.role === "FOURNISSEUR" && user?.id && carrier?.fournisseurId === user.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: carrierId } = await params;
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) return NextResponse.json({ error: "Non autorisé" }, { status: 403 });

  try {
    const { searchParams } = new URL(request.url);
    const rateId = searchParams.get("id");
    if (!rateId) return NextResponse.json({ error: "Paramètre 'id' requis" }, { status: 400 });
    await prisma.transportRateByDept.deleteMany({ where: { id: rateId, carrierId } });
    const carrier = await prisma.carrier.findUnique({ where: { id: carrierId }, select: { fournisseurId: true } });
    if (user?.role === "FOURNISSEUR" && user?.id && carrier?.fournisseurId === user.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
