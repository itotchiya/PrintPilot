import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "../_helpers";

export async function GET() {
  try {
    const carriers = await prisma.carrier.findMany({
      include: { deliveryRates: { orderBy: { zone: "asc" } } },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(carriers);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const carrier = await prisma.carrier.create({ data: body });
    return NextResponse.json(carrier, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
