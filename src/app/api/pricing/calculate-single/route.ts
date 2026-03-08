/**
 * API route for single-method quote calculations
 * Handles both digital-only and offset-only calculations
 */

import { NextRequest } from "next/server";
import { calculateDigitalOnly, calculateOffsetOnly, type SingleMethodResult } from "@/lib/pricing/single-method-engine";
import type { QuoteInput } from "@/lib/pricing/types";

const VALID_METHODS = ["digital", "offset"] as const;
type ValidMethod = (typeof VALID_METHODS)[number];

interface RequestBody {
  input: QuoteInput;
  method: ValidMethod;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestBody = await request.json();
    const { input, method } = body;

    // Validate method
    if (!VALID_METHODS.includes(method)) {
      return Response.json(
        { error: "Methode invalide. Utilisez 'digital' ou 'offset'" },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!input.productType || !input.quantity || input.quantity <= 0) {
      return Response.json(
        { error: "Type de produit et quantite (positive) sont requis" },
        { status: 400 }
      );
    }

    // Validate format
    if (!input.format || typeof input.format !== "object") {
      return Response.json(
        { error: "Format invalide" },
        { status: 400 }
      );
    }

    // Get user session for scope
    const scope: string | null = null;

    let result: SingleMethodResult;

    if (method === "digital") {
      result = await calculateDigitalOnly(input, scope);
    } else {
      result = await calculateOffsetOnly(input, scope);
    }

    return Response.json({
      success: true,
      method,
      result: {
        total: result.total,
        breakdown: result.breakdown,
        deliveryCost: result.deliveryCost,
        weightPerCopyGrams: result.weightPerCopyGrams,
        currency: result.currency,
        calculationVariablesInputs: result.calculationVariablesInputs,
        calculationVariablesMethod: result.calculationVariablesMethod,
        error: result.error,
        suggestion: result.suggestion,
        bestCarrierName: result.bestCarrierName,
        finishingExtras: result.finishingExtras,
      },
    });
  } catch (error: unknown) {
    console.error("Error in single-method calculation:", error);
    const message = error instanceof Error ? error.message : "Erreur de calcul";
    return Response.json({ error: message }, { status: 500 });
  }
}
