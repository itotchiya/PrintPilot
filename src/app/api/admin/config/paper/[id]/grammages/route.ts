import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "../../../_helpers";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const grammages = await prisma.paperGrammage.findMany({
      where: { paperTypeId: id },
      orderBy: { grammage: "asc" },
    });
    return NextResponse.json(grammages);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  try {
    const body = await request.json();
    const grammage = await prisma.paperGrammage.create({
      data: { ...body, paperTypeId: id },
    });
    return NextResponse.json(grammage, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
