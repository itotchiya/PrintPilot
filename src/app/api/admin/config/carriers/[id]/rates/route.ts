import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "../../../_helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const rates = await prisma.deliveryRate.findMany({
      where: { carrierId: id },
      orderBy: [{ zone: "asc" }, { maxWeightKg: "asc" }],
    });
    return NextResponse.json(rates);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const rate = await prisma.deliveryRate.create({
      data: { ...body, carrierId: id },
    });
    return NextResponse.json(rate, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: carrierId } = await params;

  try {
    const body = await request.json();
    const { id: rateId, ...data } = body;
    if (!rateId) {
      return NextResponse.json(
        { error: "Le champ 'id' (tarif) est requis" },
        { status: 400 }
      );
    }
    const rate = await prisma.deliveryRate.updateMany({
      where: { id: rateId, carrierId },
      data,
    });
    if (rate.count === 0) {
      return NextResponse.json(
        { error: "Tarif introuvable" },
        { status: 404 }
      );
    }
    const updated = await prisma.deliveryRate.findUnique({
      where: { id: rateId },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: carrierId } = await params;
  const { searchParams } = new URL(request.url);
  const rateId = searchParams.get("id");

  if (!rateId) {
    return NextResponse.json(
      { error: "Paramètre id (tarif) requis" },
      { status: 400 }
    );
  }

  try {
    await prisma.deliveryRate.deleteMany({
      where: { id: rateId, carrierId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
