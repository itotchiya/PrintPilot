import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CATEGORY_CONFIG, getModel, errorResponse, markFournisseurConfigCustomized } from "../../_helpers";

type RouteParams = { params: Promise<{ category: string; id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { category, id } = await params;
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return NextResponse.json(
      { error: `Catégorie inconnue : ${category}` },
      { status: 404 },
    );
  }

  try {
    const model = getModel(config.model);
    const record = await model.findUnique({
      where: { id },
      ...(config.include && { include: config.include }),
    });

    if (!record) {
      return NextResponse.json(
        { error: "Enregistrement introuvable" },
        { status: 404 },
      );
    }

    return NextResponse.json(record);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { category, id } = await params;
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return NextResponse.json(
      { error: `Catégorie inconnue : ${category}` },
      { status: 404 },
    );
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  try {
    const body = await request.json();
    const { id: _bodyId, ...data } = body;
    const model = getModel(config.model);
    const updated = await model.update({ where: { id }, data });
    if (user?.role === "FOURNISSEUR" && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { category, id } = await params;
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return NextResponse.json(
      { error: `Catégorie inconnue : ${category}` },
      { status: 404 },
    );
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  try {
    const model = getModel(config.model);
    await model.delete({ where: { id } });
    if (user?.role === "FOURNISSEUR" && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return errorResponse(error);
  }
}
