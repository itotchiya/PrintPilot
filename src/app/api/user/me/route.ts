import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ configCustomizedAt: null }, { status: 200 });
  }
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { configCustomizedAt: true },
  });
  return NextResponse.json({
    configCustomizedAt: db?.configCustomizedAt?.toISOString() ?? null,
  });
}
