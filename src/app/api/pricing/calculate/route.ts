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
    console.error("Pricing calculation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Erreur de calcul" },
      { status: 500 }
    );
  }
}