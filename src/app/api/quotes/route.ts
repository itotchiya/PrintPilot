import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateQuoteNumber } from "@/lib/utils";
import type { QuoteInput } from "@/lib/pricing/types";

function errorResponse(error: unknown, status = 500) {
  const message =
    error instanceof Error ? error.message : "Erreur interne du serveur";
  return NextResponse.json({ error: message }, { status });
}

// GET /api/quotes — list quotes (admin sees all, client sees own)
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") ?? undefined;
  const productType = searchParams.get("productType") ?? undefined;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(
    500,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10))
  );
  const skip = (page - 1) * limit;

  try {
    const where = {
      ...(user.role !== "ADMIN" && { userId: user.id }),
      ...(status && { status: status as never }),
      ...(productType && { productType: productType as never }),
    };

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ]);

    return NextResponse.json({ quotes, total, page, limit });
  } catch (error) {
    return errorResponse(error);
  }
}

// POST /api/quotes — create a new quote
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }

  const user = session.user as { id: string; role: string };

  try {
    const body = (await request.json()) as QuoteInput & {
      digitalTotal?: number;
      offsetTotal?: number;
      digitalBreakdown?: unknown;
      offsetBreakdown?: unknown;
      deliveryCost?: number;
      weightPerCopyGrams?: number;
      selectedMethod?: string;
    };

    if (!body.productType || !body.quantity || !body.format) {
      return NextResponse.json(
        { error: "Champs obligatoires manquants : productType, quantity, format" },
        { status: 400 }
      );
    }

    const quoteNumber = generateQuoteNumber();

    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId: user.id,
        status: "DRAFT",
        productType: body.productType,
        quantity: body.quantity,
        formatName: body.format.name,
        formatWidth: body.format.widthCm,
        formatHeight: body.format.heightCm,
        openFormatWidth: body.openFormat?.widthCm ?? null,
        openFormatHeight: body.openFormat?.heightCm ?? null,
        pagesInterior: body.pagesInterior ?? null,
        pagesCover: body.pagesCover ?? 0,
        flapSize: body.flapSizeCm ?? 0,
        paperInteriorType: body.paperInteriorTypeId ?? null,
        paperInteriorGram: body.paperInteriorGrammage ?? null,
        paperCoverType: body.paperCoverTypeId ?? null,
        paperCoverGram: body.paperCoverGrammage ?? null,
        colorModeInterior: body.colorModeInteriorId ?? null,
        colorModeCover: body.colorModeCoverId ?? null,
        rectoVerso: body.rectoVerso ?? false,
        bindingType: body.bindingTypeId ?? null,
        foldType: body.foldTypeId ?? null,
        foldCount: body.foldCount ?? 0,
        secondaryFoldType: body.secondaryFoldType ?? null,
        secondaryFoldCount: body.secondaryFoldCount ?? 0,
        laminationMode: body.laminationMode ?? null,
        laminationFinish: body.laminationFinishId ?? null,
        packaging: body.packaging ? JSON.parse(JSON.stringify(body.packaging)) : null,
        deliveryPoints: body.deliveryPoints ? JSON.parse(JSON.stringify(body.deliveryPoints)) : null,
        digitalPrice: body.digitalTotal ?? null,
        offsetPrice: body.offsetTotal ?? null,
        digitalBreakdown: (body.digitalBreakdown as never) ?? null,
        offsetBreakdown: (body.offsetBreakdown as never) ?? null,
        deliveryCost: body.deliveryCost ?? null,
        selectedMethod: body.selectedMethod ?? null,
        weightPerCopy: body.weightPerCopyGrams
          ? body.weightPerCopyGrams / 1000
          : null,
        totalWeight:
          body.weightPerCopyGrams && body.quantity
            ? (body.weightPerCopyGrams * body.quantity) / 1000
            : null,
      },
    });

    return NextResponse.json(
      { id: quote.id, quoteNumber: quote.quoteNumber },
      { status: 201 }
    );
  } catch (error) {
    return errorResponse(error);
  }
}
