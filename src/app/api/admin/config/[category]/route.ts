import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { CATEGORY_CONFIG, getModel, errorResponse, isScopedCategory, markFournisseurConfigCustomized } from "../_helpers";

type RouteParams = { params: Promise<{ category: string }> };

function getConfigScope(
  request: NextRequest,
  role: string | undefined,
  userId: string | undefined
): string | null {
  if (!role || !userId) return null;
  if (role === "FOURNISSEUR" || role === "ADMIN" || role === "EMPLOYEE") return userId;
  if (role === "SUPER_ADMIN") {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("fournisseurId");
    return q ?? null;
  }
  return null;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { category } = await params;
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return NextResponse.json(
      { error: `Catégorie inconnue : ${category}` },
      { status: 404 },
    );
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const role = user?.role;
  const scope = isScopedCategory(category)
    ? getConfigScope(request, role, user?.id)
    : undefined;

  try {
    const model = getModel(config.model);
    const where = isScopedCategory(category)
      ? { fournisseurId: scope ?? null }
      : undefined;
    const data = await model.findMany({
      ...(where && { where }),
      ...(config.include && { include: config.include }),
      ...(config.orderBy && { orderBy: config.orderBy }),
    });
    return NextResponse.json(data);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { category } = await params;
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return NextResponse.json(
      { error: `Catégorie inconnue : ${category}` },
      { status: 404 },
    );
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const scope = isScopedCategory(category)
    ? getConfigScope(request, user?.role, user?.id)
    : undefined;

  try {
    const body = await request.json();
    const model = getModel(config.model);
    let data =
      category === "delivery" && typeof body.displayName === "undefined"
        ? { ...body, displayName: body.name ?? body.code ?? "" }
        : body;
    if (isScopedCategory(category) && scope !== undefined) {
      data = { ...data, fournisseurId: scope };
    }
    const created = await model.create({ data });
    if (user?.role === "FOURNISSEUR" && scope === user?.id && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { category } = await params;
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return NextResponse.json(
      { error: `Catégorie inconnue : ${category}` },
      { status: 404 },
    );
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const scope = isScopedCategory(category)
    ? getConfigScope(request, user?.role, user?.id)
    : undefined;

  try {
    const body = await request.json();
    const { id, ...data } = body;
    const model = getModel(config.model);
    const whereScope = isScopedCategory(category) && scope !== undefined
      ? { fournisseurId: scope }
      : undefined;

    let updated;
    if (!id && config.uniqueField) {
      const key = data[config.uniqueField] ?? body[config.uniqueField];
      updated = await model.update({
        where: {
          ...(whereScope ?? {}),
          [config.uniqueField]: key,
        },
        data,
      });
    } else {
      if (!id) {
        return NextResponse.json(
          { error: "Le champ 'id' est requis" },
          { status: 400 },
        );
      }
      updated = await model.update({
        where: { id, ...(whereScope ?? {}) },
        data,
      });
    }

    if (user?.role === "FOURNISSEUR" && scope === user?.id && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return NextResponse.json(updated);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { category } = await params;
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return NextResponse.json(
      { error: `Catégorie inconnue : ${category}` },
      { status: 404 },
    );
  }

  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string; role?: string } | undefined;
  const canWrite = ["FOURNISSEUR", "SUPER_ADMIN", "ADMIN", "EMPLOYEE"].includes(user?.role ?? "");
  if (!canWrite) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const scope = isScopedCategory(category)
    ? getConfigScope(request, user?.role, user?.id)
    : undefined;

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Le paramètre 'id' est requis" },
        { status: 400 },
      );
    }

    const model = getModel(config.model);
    const where = isScopedCategory(category) && scope !== undefined
      ? { id, fournisseurId: scope }
      : { id };
    await model.delete({ where });

    if (user?.role === "FOURNISSEUR" && scope === user?.id && user?.id) {
      await markFournisseurConfigCustomized(user.id);
    }
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
