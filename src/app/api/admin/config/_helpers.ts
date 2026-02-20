import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/** Categories that are scoped by fournisseurId (default config when null). Department (delivery) is global. */
const SCOPED_CATEGORIES = new Set([
  "paper",
  "formats",
  "colors",
  "binding",
  "folds",
  "lamination",
  "packaging",
  "offset",
  "digital",
  "margins",
]);

export function isScopedCategory(category: string): boolean {
  return SCOPED_CATEGORIES.has(category);
}

export const CATEGORY_CONFIG: Record<
  string,
  {
    model: string;
    include?: Record<string, unknown>;
    orderBy?: Record<string, string>;
    uniqueField?: string;
  }
> = {
  paper: {
    model: "paperType",
    include: { grammages: { orderBy: { grammage: "asc" } } },
    orderBy: { sortOrder: "asc" },
  },
  formats: { model: "formatPreset", orderBy: { name: "asc" } },
  colors: { model: "colorMode", orderBy: { name: "asc" } },
  binding: {
    model: "bindingType",
    include: { digitalPriceTiers: true, offsetPriceTiers: true },
    orderBy: { name: "asc" },
  },
  folds: {
    model: "foldType",
    include: { costs: { orderBy: { numFolds: "asc" } } },
    orderBy: { name: "asc" },
  },
  lamination: {
    model: "laminationFinish",
    include: { digitalPriceTiers: true },
    orderBy: { name: "asc" },
  },
  packaging: { model: "packagingOption", orderBy: { name: "asc" } },
  delivery: { model: "department", orderBy: { code: "asc" } },
  offset: {
    model: "offsetConfig",
    orderBy: { key: "asc" },
    uniqueField: "key",
  },
  digital: {
    model: "digitalConfig",
    orderBy: { key: "asc" },
    uniqueField: "key",
  },
  margins: {
    model: "marginConfig",
    orderBy: { key: "asc" },
    uniqueField: "key",
  },
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getModel(modelName: string): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (prisma as Record<string, any>)[modelName];
}

/** Call after a Fournisseur successfully creates/updates/deletes their config (hides demo alert). Never throws. */
export async function markFournisseurConfigCustomized(userId: string) {
  try {
    await prisma.user.updateMany({
      where: { id: userId, configCustomizedAt: null },
      data: { configCustomizedAt: new Date() },
    });
  } catch {
    // Column may not exist yet (migration not run); don't break config save
  }
}

export function errorResponse(error: unknown) {
  const err = error as { code?: string; meta?: Record<string, unknown> };

  if (err.code === "P2002") {
    return NextResponse.json(
      { error: "Un enregistrement avec cette valeur existe déjà", meta: err.meta },
      { status: 409 },
    );
  }

  if (err.code === "P2025") {
    return NextResponse.json(
      { error: "Enregistrement introuvable" },
      { status: 404 },
    );
  }

  console.error("Admin config API error:", error);
  return NextResponse.json(
    { error: "Une erreur interne est survenue" },
    { status: 500 },
  );
}
