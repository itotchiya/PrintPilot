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

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;
    if (!id) {
      return NextResponse.json(
        { error: "Le champ 'id' est requis" },
        { status: 400 }
      );
    }
    const carrier = await prisma.carrier.update({
      where: { id },
      data,
    });
    return NextResponse.json(carrier);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "Paramètre id requis" },
      { status: 400 }
    );
  }
  try {
    await prisma.carrier.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
