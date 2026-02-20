import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, markFournisseurConfigCustomized } from "../_helpers";

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
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  try {
    const body = await request.json();
    const format = await prisma.machineFormat.create({ data: body });
    if (user?.role === "FOURNISSEUR" && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(format, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
