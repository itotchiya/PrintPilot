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
