import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { errorResponse, markFournisseurConfigCustomized } from "../_helpers";

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
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  try {
    const body = await request.json();
    const divisor = await prisma.formatClickDivisor.create({ data: body });
    if (user?.role === "FOURNISSEUR" && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(divisor, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}
