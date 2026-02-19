import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "../../../_helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const tiers = await prisma.laminationPriceTier.findMany({
      where: { finishId: id },
      orderBy: { qtyMin: "asc" },
    });
    return NextResponse.json(tiers);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const tier = await prisma.laminationPriceTier.create({
      data: { ...body, finishId: id },
    });
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: finishId } = await params;

  try {
    const body = await request.json();
    const { id: tierId, ...data } = body;
    if (!tierId) {
      return NextResponse.json(
        { error: "Le champ 'id' (palier) est requis" },
        { status: 400 }
      );
    }
    const tier = await prisma.laminationPriceTier.updateMany({
      where: { id: tierId, finishId },
      data,
    });
    if (tier.count === 0) {
      return NextResponse.json(
        { error: "Palier introuvable" },
        { status: 404 }
      );
    }
    const updated = await prisma.laminationPriceTier.findUnique({
      where: { id: tierId },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: finishId } = await params;
  const { searchParams } = new URL(request.url);
  const tierId = searchParams.get("id");

  if (!tierId) {
    return NextResponse.json(
      { error: "Paramètre id (palier) requis" },
      { status: 400 }
    );
  }

  try {
    await prisma.laminationPriceTier.deleteMany({
      where: { id: tierId, finishId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
