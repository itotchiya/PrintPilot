import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

function errorResponse(error: unknown, status = 500) {
  const message =
    error instanceof Error ? error.message : "Erreur interne du serveur";
  return NextResponse.json({ error: message }, { status });
}

// GET /api/quotes/[id] — fetch a single quote
export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { user: { select: { id: true, name: true, email: true } } },
    });

    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }
    const canAccessAnyQuote = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN", "FOURNISSEUR"].includes(user.role);
    if (!canAccessAnyQuote && quote.userId !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    return NextResponse.json(quote);
  } catch (error) {
    return errorResponse(error);
  }
}

// PUT /api/quotes/[id] — update status or selectedMethod
export async function PUT(request: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  const { id } = await params;

  try {
    const body = await request.json();

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }
    const canAccessAnyQuote = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN", "FOURNISSEUR"].includes(user.role);
    if (!canAccessAnyQuote && quote.userId !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }
    if (body.status && !["ADMIN", "EMPLOYEE", "SUPER_ADMIN", "FOURNISSEUR"].includes(user.role)) {
      return NextResponse.json(
        { error: "Seul un administrateur peut modifier le statut" },
        { status: 403 }
      );
    }

    const updated = await prisma.quote.update({
      where: { id },
      data: {
        ...(body.status !== undefined && { status: body.status }),
        ...(body.selectedMethod !== undefined && {
          selectedMethod: body.selectedMethod,
        }),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

// DELETE /api/quotes/[id] — delete a quote
export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  const { id } = await params;

  try {
    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      return NextResponse.json({ error: "Devis introuvable" }, { status: 404 });
    }
    const canAccessAnyQuote = ["ADMIN", "EMPLOYEE", "SUPER_ADMIN", "FOURNISSEUR"].includes(user.role);
    if (!canAccessAnyQuote && quote.userId !== user.id) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    await prisma.quote.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
