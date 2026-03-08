import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  if (!user?.id) {
    return NextResponse.json({ emailVerified: null }, { status: 200 });
  }
  const db = await prisma.user.findUnique({
    where: { id: user.id },
    select: { emailVerified: true },
  });
  return NextResponse.json({
    emailVerified: db?.emailVerified?.toISOString() ?? null,
  });
}
