import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  // Get all clients with their supplier access
  const clients = await prisma.user.findMany({
    where: { role: "CLIENT" },
    select: {
      id: true,
      name: true,
      email: true,
    },
  });

  // Get supplier access for each client
  const clientsWithAccess = await Promise.all(
    clients.map(async (client) => {
      const access = await prisma.supplierClientAccess.findMany({
        where: { clientId: client.id },
        include: {
          supplier: {
            select: { 
              id: true,
              companyName: true,
              user: { select: { name: true } }
            },
          },
        },
      });
      return {
        ...client,
        supplierIds: access.map((a) => a.supplierId),
        suppliers: access.map((a) => ({ 
          id: a.supplier.id, 
          name: a.supplier.companyName || a.supplier.user?.name 
        })),
      };
    })
  );

  // Get all suppliers
  const suppliers = await prisma.supplierProfile.findMany({
    select: { 
      id: true, 
      companyName: true,
      user: { select: { name: true, email: true } }
    },
    orderBy: { companyName: "asc" },
  });

  return NextResponse.json({
    clients: clientsWithAccess,
    suppliers: suppliers.map(s => ({
      id: s.id,
      name: s.companyName || s.user?.name,
      email: s.user?.email,
    })),
  });
}

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string; id?: string } | undefined;
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const body = await request.json();
  const { clientId, supplierId } = body as { clientId?: string; supplierId?: string };
  if (!clientId || !supplierId) {
    return NextResponse.json(
      { error: "clientId et supplierId requis" },
      { status: 400 }
    );
  }

  const created = await prisma.supplierClientAccess.create({
    data: { 
      clientId, 
      supplierId,
      invitedBy: user.id!,
    },
  });
  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const user = session?.user as { role?: string } | undefined;
  if (user?.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get("clientId");
  const supplierId = searchParams.get("supplierId");
  if (!clientId || !supplierId) {
    return NextResponse.json(
      { error: "Paramètres clientId et supplierId requis" },
      { status: 400 }
    );
  }

  await prisma.supplierClientAccess.deleteMany({
    where: { clientId, supplierId },
  });
  return new NextResponse(null, { status: 204 });
}
