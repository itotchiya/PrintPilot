import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorResponse } from "../_helpers";

export async function GET() {
  try {
    const formats = await prisma.machineFormat.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(formats);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const format = await prisma.machineFormat.create({ data: body });
    return NextResponse.json(format, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
