import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "../_helpers";

export async function GET() {
  try {
    const modes = await prisma.laminationMode.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(modes);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const mode = await prisma.laminationMode.create({ data: body });
    return NextResponse.json(mode, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
