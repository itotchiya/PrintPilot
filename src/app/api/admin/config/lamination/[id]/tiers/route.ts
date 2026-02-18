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
