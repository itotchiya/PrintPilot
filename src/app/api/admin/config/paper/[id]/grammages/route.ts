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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { id: paperTypeId } = await params;

  try {
    const body = await request.json();
    const { id: grammageId, ...data } = body;
    if (!grammageId) {
      return NextResponse.json(
        { error: "Le champ 'id' (grammage) est requis" },
        { status: 400 }
      );
    }
    const grammage = await prisma.paperGrammage.updateMany({
      where: { id: grammageId, paperTypeId },
      data,
    });
    if (grammage.count === 0) {
      return NextResponse.json(
        { error: "Grammage introuvable" },
        { status: 404 }
      );
    }
    const updated = await prisma.paperGrammage.findUnique({
      where: { id: grammageId },
    });
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: paperTypeId } = await params;
  const { searchParams } = new URL(request.url);
  const grammageId = searchParams.get("id");

  if (!grammageId) {
    return NextResponse.json(
      { error: "Paramètre id (grammage) requis" },
      { status: 400 }
    );
  }

  try {
    await prisma.paperGrammage.deleteMany({
      where: {
        id: grammageId,
        paperTypeId,
      },
    });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
