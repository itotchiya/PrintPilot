import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "../_helpers";

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
  try {
    const body = await request.json();
    const divisor = await prisma.formatClickDivisor.create({ data: body });
    return NextResponse.json(divisor, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
