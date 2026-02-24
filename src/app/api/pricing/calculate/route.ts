import { NextRequest, NextResponse } from "next/server";
import { calculatePricing } from "@/lib/pricing/engine";
import type { QuoteInput } from "@/lib/pricing/types";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as QuoteInput & { fournisseurId?: string | null };

    if (!body.productType || !body.quantity || body.quantity <= 0) {
      return NextResponse.json(
        { error: "Donnees incompletes : type de produit et quantite requis" },
        { status: 400 }
      );
    }

    const { fournisseurId, ...quoteInput } = body;
    const result = await calculatePricing(quoteInput, fournisseurId);

    return NextResponse.json({
      status: "ok",
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erreur de calcul";
    const stack = error instanceof Error ? error.stack : undefined;
    console.error("Pricing calculation error:", message);
    if (stack) console.error(stack);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}