import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "../../../_helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const tiers = await prisma.bindingPriceTierDigital.findMany({
      where: { bindingTypeId: id },
      orderBy: { pageRangeMin: "asc" },
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
    const tier = await prisma.bindingPriceTierDigital.create({
      data: { ...body, bindingTypeId: id },
    });
    return NextResponse.json(tier, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const { id: tierId, ...data } = body;
    if (!tierId) {
      return NextResponse.json(
        { error: "Le champ 'id' est requis" },
        { status: 400 },
      );
    }
    const tier = await prisma.bindingPriceTierDigital.update({
      where: { id: tierId },
      data,
    });
    return NextResponse.json(tier);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const { searchParams } = new URL(request.url);
    const tierId = searchParams.get("id");
    if (!tierId) {
      return NextResponse.json(
        { error: "Le paramètre 'id' est requis" },
        { status: 400 },
      );
    }
    await prisma.bindingPriceTierDigital.delete({
      where: { id: tierId },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
