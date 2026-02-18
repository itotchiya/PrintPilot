import { NextRequest, NextResponse } from "next/server";
import { CATEGORY_CONFIG, getModel, errorResponse } from "../_helpers";

type RouteParams = { params: Promise<{ category: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { category } = await params;
  const config = CATEGORY_CONFIG[category];

  if (!config) {
    return NextResponse.json(
      { error: `Catégorie inconnue : ${category}` },
      { status: 404 },
    );
  }

  try {
    const model = getModel(config.model);
    const data = await model.findMany({
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

  try {
    const body = await request.json();
    const model = getModel(config.model);
    const created = await model.create({ data: body });
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

  try {
    const body = await request.json();
    const { id, ...data } = body;
    const model = getModel(config.model);

    let updated;
    if (!id && config.uniqueField) {
      const key = data[config.uniqueField] ?? body[config.uniqueField];
      updated = await model.update({
        where: { [config.uniqueField]: key },
        data,
      });
    } else {
      if (!id) {
        return NextResponse.json(
          { error: "Le champ 'id' est requis" },
          { status: 400 },
        );
      }
      updated = await model.update({ where: { id }, data });
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
    await model.delete({ where: { id } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return errorResponse(error);
  }
}
