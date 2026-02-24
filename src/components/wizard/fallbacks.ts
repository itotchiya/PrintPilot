/**
 * Fallback data used when the /api/admin/config/* endpoints are unavailable
 * (e.g. DB not yet seeded, network error, unauthenticated).
 * Mirrors the paper types, grammages and colour modes defined in prisma/seed.ts
 * and in docs/sheets/Tableau_papier.csv.
 */

export interface PaperGrammage {
  id: string;
  grammage: number;
  pricePerKg: number;
  active: boolean;
}

export interface PaperType {
  id: string;
  name: string;
  category: string;
  active: boolean;
  grammages: PaperGrammage[];
}

function grams(prefix: string, values: number[], pricePerKg = 1.0): PaperGrammage[] {
  return values.map((g, i) => ({
    id: `${prefix}-g${i}`,
    grammage: g,
    pricePerKg,
    active: true,
  }));
}

/**
 * All paper types, matching the seed and Excel (Tableau_papier.csv).
 *
 * category "BOTH"     → shown in both cover and interior selectors
 * category "INTERIOR" → shown only in interior selector
 * category "COVER"    → shown only in cover selector
 *
 * Grammage lists are the union of interior + cover ranges from Tableau_papier.csv
 * so that both selectors can show appropriate values.
 */
export const FALLBACK_PAPER_TYPES: PaperType[] = [
  {
    id: "fb-p-1",
    name: "Couche Satin",
    category: "BOTH",
    active: true,
    // interior: 80–170  |  cover: 115–400
    grammages: grams("fb-p1", [80, 90, 100, 115, 135, 150, 170, 200, 250, 300, 350, 400], 1.0),
  },
  {
    id: "fb-p-2",
    name: "Couche Mat",
    category: "BOTH",
    active: true,
    grammages: grams("fb-p2", [80, 90, 100, 115, 135, 150, 170, 200, 250, 300, 350, 400], 1.0),
  },
  {
    id: "fb-p-3",
    name: "Brillant",
    category: "BOTH",
    active: true,
    grammages: grams("fb-p3", [80, 90, 100, 115, 135, 150, 170, 200, 250, 300, 350, 400], 1.0),
  },
  {
    id: "fb-p-4",
    name: "Offset",
    category: "BOTH",
    active: true,
    // interior: 70–120  |  cover: 250
    grammages: grams("fb-p4", [70, 80, 90, 100, 110, 115, 120, 250], 1.15),
  },
  {
    id: "fb-p-5",
    name: "Recycle",
    category: "BOTH",
    active: true,
    // interior: 70–135  |  cover: 100–120
    grammages: grams("fb-p5", [70, 80, 90, 100, 110, 115, 120, 130, 135], 1.4),
  },
  {
    id: "fb-p-6",
    name: "Autre",
    category: "BOTH",
    active: true,
    // interior: 70–135  |  cover: 115–400
    grammages: grams("fb-p6", [70, 80, 90, 100, 110, 115, 120, 130, 135, 150, 170, 200, 220, 240, 250, 300, 350, 400], 1.0),
  },
  {
    id: "fb-p-7",
    name: "Bouffant Munken Blanc",
    category: "INTERIOR",
    active: true,
    grammages: grams("fb-p7", [80, 90], 2.4),
  },
  {
    id: "fb-p-8",
    name: "Bouffant Munken Creme",
    category: "INTERIOR",
    active: true,
    grammages: grams("fb-p8", [80, 90], 2.4),
  },
  {
    id: "fb-p-9",
    name: "Bouffant Blanc",
    category: "INTERIOR",
    active: true,
    grammages: grams("fb-p9", [80, 90], 1.6),
  },
  {
    id: "fb-p-10",
    name: "Carte 1 face",
    category: "COVER",
    active: true,
    grammages: grams("fb-p10", [240, 300, 350], 1.29),
  },
];
