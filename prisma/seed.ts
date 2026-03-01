import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Weight reference: kg per 1000 sheets at 33×48.7 cm ─────────────────────
const WEIGHT_MAP: Record<number, number> = {
  70: 11.25,
  80: 12.86,
  90: 14.46,
  100: 16.07,
  110: 17.68,
  115: 18.48,
  120: 19.29,
  130: 20.89,
  135: 21.7,
  150: 24.11,
  170: 27.32,
  200: 32.14,
  220: 35.36,
  240: 38.57,
  250: 40.18,
  300: 48.21,
  350: 56.25,
  400: 64.29,
};

async function main() {
  console.log("🗑️  Cleaning database…");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (prisma as any).transportRateByDept.deleteMany();
  await prisma.deliveryRate.deleteMany();
  await prisma.carrier.deleteMany();
  await prisma.department.deleteMany();
  await prisma.laminationPriceTier.deleteMany();
  await prisma.laminationFinish.deleteMany();
  await prisma.laminationMode.deleteMany();
  await prisma.foldCost.deleteMany();
  await prisma.foldType.deleteMany();
  await prisma.bindingPriceTierDigital.deleteMany();
  await prisma.bindingPriceTierOffset.deleteMany();
  await prisma.bindingType.deleteMany();
  await prisma.colorMode.deleteMany();
  await prisma.formatPreset.deleteMany();
  await prisma.paperGrammage.deleteMany();
  await prisma.paperType.deleteMany();
  await prisma.packagingOption.deleteMany();
  await prisma.offsetConfig.deleteMany();
  await prisma.digitalConfig.deleteMany();
  await prisma.marginConfig.deleteMany();
  await prisma.machineFormat.deleteMany();
  await prisma.formatClickDivisor.deleteMany();
  await prisma.acheteurFournisseurAccess.deleteMany();
  await prisma.quote.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database cleaned");

  // ── 1. SuperAdmin + Admin (Fournisseur) users ─────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);
  const superAdmin = await prisma.user.upsert({
    where: { email: "superadmin@printpilot.fr" },
    update: {},
    create: {
      name: "Super Admin PrintPilot",
      email: "superadmin@printpilot.fr",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });
  console.log(`👤 SuperAdmin user created: ${superAdmin.email}`);

  const admin = await prisma.user.upsert({
    where: { email: "admin@printpilot.fr" },
    update: {},
    create: {
      name: "Admin PrintPilot",
      email: "admin@printpilot.fr",
      passwordHash,
      role: "FOURNISSEUR",
    },
  });
  console.log(`👤 Fournisseur (admin) user created: ${admin.email}`);

  const acheteur = await prisma.user.upsert({
    where: { email: "acheteur@printpilot.fr" },
    update: {},
    create: {
      name: "Acheteur PrintPilot",
      email: "acheteur@printpilot.fr",
      passwordHash,
      role: "ACHETEUR",
    },
  });
  console.log(`👤 Acheteur user created: ${acheteur.email}`);

  // Link Acheteur to Fournisseur so they can compare quotes from this supplier
  await prisma.acheteurFournisseurAccess.upsert({
    where: {
      acheteurId_fournisseurId: { acheteurId: acheteur.id, fournisseurId: admin.id },
    },
    update: {},
    create: {
      acheteurId: acheteur.id,
      fournisseurId: admin.id,
    },
  });
  console.log(`🔗 Acheteur–Fournisseur access created`);

  // ── 2. Paper Types ───────────────────────────────────────────────────────
  const paperTypesData = [
    { name: "Couche Satin", category: "BOTH" as const, sortOrder: 1 },
    { name: "Couche Mat", category: "BOTH" as const, sortOrder: 2 },
    { name: "Brillant", category: "BOTH" as const, sortOrder: 3 },
    { name: "Offset", category: "BOTH" as const, sortOrder: 4 },
    { name: "Recycle", category: "BOTH" as const, sortOrder: 5 },
    { name: "Autre", category: "BOTH" as const, sortOrder: 6 },
    { name: "Bouffant Munken Blanc", category: "INTERIOR" as const, sortOrder: 7 },
    { name: "Bouffant Munken Creme", category: "INTERIOR" as const, sortOrder: 8 },
    { name: "Bouffant Blanc", category: "INTERIOR" as const, sortOrder: 9 },
    { name: "Carte 1 face", category: "COVER" as const, sortOrder: 10 },
  ];

  const paperTypes: Record<string, { id: string }> = {};
  for (const pt of paperTypesData) {
    let row = await prisma.paperType.findFirst({ where: { fournisseurId: null, name: pt.name } });
    if (!row) row = await prisma.paperType.create({ data: { ...pt } });
    paperTypes[pt.name] = row;
  }
  console.log(`📄 ${Object.keys(paperTypes).length} paper types created`);

  // ── 3. Paper Grammages ───────────────────────────────────────────────────
  type GrammageEntry = { grammage: number; pricePerKg: number; thicknessPer100?: number };

  const standardGrammages: GrammageEntry[] = [80, 90, 100, 115, 130, 135, 150, 170, 200, 250, 300, 350].map(
    (g) => ({ grammage: g, pricePerKg: 1.0 })
  );
  // XLSM Tableau_papier: 400g couché = 1.63 EUR/kg (premium grammage surcharge)
  const standardGrammagesWith400g: GrammageEntry[] = [
    ...standardGrammages,
    { grammage: 400, pricePerKg: 1.63 },
  ];

  const grammagesByPaper: Record<string, GrammageEntry[]> = {
    "Couche Satin": standardGrammagesWith400g,
    "Couche Mat": standardGrammagesWith400g,
    Brillant: standardGrammagesWith400g,
    Recycle: [
      { grammage: 70, pricePerKg: 1.4 },
      { grammage: 80, pricePerKg: 1.4 },
      { grammage: 90, pricePerKg: 1.4 },
      { grammage: 100, pricePerKg: 1.5 },
      { grammage: 110, pricePerKg: 1.5 },
      { grammage: 115, pricePerKg: 1.5 },
      { grammage: 120, pricePerKg: 1.5 },
      { grammage: 130, pricePerKg: 1.405 },
      { grammage: 135, pricePerKg: 1.5 },
    ],
    Offset: [
      { grammage: 70, pricePerKg: 1.16 },
      { grammage: 80, pricePerKg: 1.15 },
      { grammage: 90, pricePerKg: 1.15 },
      { grammage: 100, pricePerKg: 1.25 },
      { grammage: 110, pricePerKg: 1.25 },
      { grammage: 115, pricePerKg: 1.25 },
      { grammage: 120, pricePerKg: 1.25 },
      { grammage: 250, pricePerKg: 1.5 },
    ],
    "Carte 1 face": [
      { grammage: 240, pricePerKg: 1.29 },
      { grammage: 300, pricePerKg: 1.29 },
      { grammage: 350, pricePerKg: 1.29 },
    ],
    // "Autre" = generic/non-standard paper — covers both interior (70–135) and cover (115–400) usage
    Autre: [
      { grammage: 70, pricePerKg: 1.0 },
      { grammage: 80, pricePerKg: 1.0 },
      { grammage: 90, pricePerKg: 1.0 },
      { grammage: 100, pricePerKg: 1.0 },
      { grammage: 110, pricePerKg: 1.0 },
      { grammage: 115, pricePerKg: 1.0 },
      { grammage: 120, pricePerKg: 1.0 },
      { grammage: 130, pricePerKg: 1.0 },
      { grammage: 135, pricePerKg: 1.0 },
      { grammage: 150, pricePerKg: 1.0 },
      { grammage: 170, pricePerKg: 1.0 },
      { grammage: 200, pricePerKg: 1.0 },
      { grammage: 220, pricePerKg: 1.0 },
      { grammage: 240, pricePerKg: 1.0 },
      { grammage: 250, pricePerKg: 1.0 },
      { grammage: 300, pricePerKg: 1.0 },
      { grammage: 350, pricePerKg: 1.0 },
      { grammage: 400, pricePerKg: 1.0 },
    ],
    "Bouffant Munken Blanc": [
      { grammage: 80, pricePerKg: 2.4 },
      { grammage: 90, pricePerKg: 2.4 },
    ],
    "Bouffant Munken Creme": [
      { grammage: 80, pricePerKg: 2.4 },
      { grammage: 90, pricePerKg: 2.4 },
    ],
    "Bouffant Blanc": [
      { grammage: 80, pricePerKg: 1.6 },
      { grammage: 90, pricePerKg: 1.6 },
    ],
  };

  let grammageCount = 0;
  for (const [paperName, entries] of Object.entries(grammagesByPaper)) {
    const paperTypeId = paperTypes[paperName].id;
    for (const entry of entries) {
      await prisma.paperGrammage.upsert({
        where: { paperTypeId_grammage: { paperTypeId, grammage: entry.grammage } },
        update: {},
        create: {
          paperTypeId,
          grammage: entry.grammage,
          pricePerKg: entry.pricePerKg,
          weightPer1000Sheets: WEIGHT_MAP[entry.grammage] ?? null,
          thicknessPer100: entry.thicknessPer100 ?? (entry.grammage / 100) * (paperName.includes("Brillant") ? 0.8 : paperName.includes("Offset") ? 1.2 : 1.0),
        },
      });
      grammageCount++;
    }
  }
  console.log(`⚖️  ${grammageCount} paper grammages created`);

  // ── 4. Format Presets ────────────────────────────────────────────────────
  const formatPresetsData = [
    { name: "A4 Francaise", widthCm: 21, heightCm: 29.7, orientation: "PORTRAIT" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER"] },
    { name: "A4 Paysage", widthCm: 29.7, heightCm: 21, orientation: "LANDSCAPE" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER"] },
    { name: "A5 Francaise", widthCm: 14.8, heightCm: 21, orientation: "PORTRAIT" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER"] },
    { name: "A5 Paysage", widthCm: 21, heightCm: 14.8, orientation: "LANDSCAPE" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER"] },
    { name: "A6 Francaise", widthCm: 10.5, heightCm: 15, orientation: "PORTRAIT" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
    { name: "A6 Paysage", widthCm: 15, heightCm: 10.5, orientation: "LANDSCAPE" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
    { name: "DL", widthCm: 10, heightCm: 21, orientation: "PORTRAIT" as const, productTypes: ["DEPLIANT", "FLYER"] },
    { name: "16x24", widthCm: 16, heightCm: 24, orientation: "PORTRAIT" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER"] },
    { name: "29.7x42 (A3)", widthCm: 29.7, heightCm: 42, orientation: "PORTRAIT" as const, productTypes: ["FLYER"] },
    { name: "Carre 15x15", widthCm: 15, heightCm: 15, orientation: "SQUARE" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER"] },
    { name: "Carre 21x21", widthCm: 21, heightCm: 21, orientation: "SQUARE" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER"] },
    { name: "Carte de visite", widthCm: 8.5, heightCm: 5.5, orientation: "LANDSCAPE" as const, productTypes: ["CARTE_DE_VISITE"] },
    { name: "Personnalise", widthCm: 0, heightCm: 0, orientation: "PORTRAIT" as const, productTypes: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
  ];

  for (const fp of formatPresetsData) {
    const row = await prisma.formatPreset.findFirst({ where: { fournisseurId: null, name: fp.name } });
    if (!row) await prisma.formatPreset.create({ data: { ...fp } });
  }
  console.log(`📐 ${formatPresetsData.length} format presets created`);

  // ── 5. Color Modes ───────────────────────────────────────────────────────
  const colorModesData = [
    { name: "Quadrichromie", platesPerSide: 4, hasVarnish: false, clickMultiplier: 1.0 },
    { name: "Quadrichromie + Vernis Machine", platesPerSide: 5, hasVarnish: true, clickMultiplier: 1.0 },
    { name: "Bichromie", platesPerSide: 2, hasVarnish: false, clickMultiplier: 0.5 },
    { name: "Noir", platesPerSide: 1, hasVarnish: false, clickMultiplier: 0.25 },
  ];

  for (const cm of colorModesData) {
    const row = await prisma.colorMode.findFirst({ where: { fournisseurId: null, name: cm.name } });
    if (!row) await prisma.colorMode.create({ data: { ...cm } });
  }
  console.log(`🎨 ${colorModesData.length} color modes created`);

  // ── 6. Binding Types + Digital Price Tiers ───────────────────────────────
  const bindingTypesData = [
    { name: "Spiro", minPages: 2, maxPages: 200, rules: {} },
    { name: "Piqure boucle", minPages: 4, maxPages: 64, rules: {} },
    { name: "WireO", minPages: 2, maxPages: 250, rules: {} },
    { name: "Sans", minPages: 1, maxPages: Infinity, rules: {} },
    { name: "Piqure", minPages: 4, maxPages: 96, rules: {} },
    { name: "Dos carre colle", minPages: 40, maxPages: null, rules: {
      extremeSpinePenalty: 0.20 // +20% for <0.3cm or >3.0cm
    }},
    { name: "Dos carre colle PUR", minPages: 40, maxPages: null, rules: {
      extremeSpinePenalty: 0.20,
      heavyPaperPenalty: { minGrammage: 171, penalty: 0.15 }, // +15% for >170g
      coucheMatPenalty: { minGrammage: 116, penalty: 0.10 },  // +10% for Couché Mat >115g
      coucheSatinPenalty: { minGrammage: 116, penalty: 0.05 }, // +5% for Couché Satin >115g
      lightPaperPenalty: { maxGrammage: 69, penalty: 0.20 } // +20% for <70g
    }},
    { name: "Dos carre colle avec couture", minPages: 40, maxPages: null, rules: {
      extremeSpinePenalty: 0.20,
      coucheMatPenalty: { minGrammage: 116, penalty: 0.15 },
      coucheSatinPenalty: { minGrammage: 116, penalty: 0.05 },
      lightPaperPenalty: { maxGrammage: 69, penalty: 0.20 }
    }},
  ];

  const bindingTypes: Record<string, { id: string }> = {};
  for (const bt of bindingTypesData) {
    let row = await prisma.bindingType.findFirst({ where: { fournisseurId: null, name: bt.name } });
    if (!row) row = await prisma.bindingType.create({ data: bt });
    bindingTypes[bt.name] = row;
  }
  console.log(`📎 ${Object.keys(bindingTypes).length} binding types created`);

  type BindingTier = {
    pageRangeMin: number;
    pageRangeMax: number;
    qtyMin: number;
    qtyMax: number;
    perUnitCost: number;
    setupCost: number;
  };

  const dosCarreColleTiers: BindingTier[] = [
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 25, qtyMax: 50, perUnitCost: 0.47, setupCost: 70 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 100, qtyMax: 200, perUnitCost: 0.47, setupCost: 70 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 200, qtyMax: 300, perUnitCost: 0.45, setupCost: 70 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 300, qtyMax: 400, perUnitCost: 0.40, setupCost: 70 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 400, qtyMax: 500, perUnitCost: 0.38, setupCost: 70 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 500, qtyMax: 99999, perUnitCost: 0.35, setupCost: 70 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 25, qtyMax: 50, perUnitCost: 0.52, setupCost: 70 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 100, qtyMax: 200, perUnitCost: 0.52, setupCost: 70 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 200, qtyMax: 300, perUnitCost: 0.51, setupCost: 70 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 300, qtyMax: 400, perUnitCost: 0.45, setupCost: 70 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 400, qtyMax: 500, perUnitCost: 0.43, setupCost: 70 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 500, qtyMax: 99999, perUnitCost: 0.40, setupCost: 70 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 25, qtyMax: 50, perUnitCost: 0.60, setupCost: 70 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 100, qtyMax: 200, perUnitCost: 0.60, setupCost: 70 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 200, qtyMax: 300, perUnitCost: 0.65, setupCost: 70 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 300, qtyMax: 400, perUnitCost: 0.65, setupCost: 70 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 400, qtyMax: 500, perUnitCost: 0.50, setupCost: 70 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 500, qtyMax: 99999, perUnitCost: 0.47, setupCost: 70 },
  ];

  const dosCarreCollePURTiers: BindingTier[] = [
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 25, qtyMax: 50, perUnitCost: 0.65, setupCost: 80 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 100, qtyMax: 200, perUnitCost: 0.59, setupCost: 80 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 200, qtyMax: 300, perUnitCost: 0.54, setupCost: 80 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 300, qtyMax: 400, perUnitCost: 0.48, setupCost: 80 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 400, qtyMax: 500, perUnitCost: 0.46, setupCost: 80 },
    { pageRangeMin: 32, pageRangeMax: 72, qtyMin: 500, qtyMax: 99999, perUnitCost: 0.42, setupCost: 80 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 25, qtyMax: 50, perUnitCost: 0.69, setupCost: 80 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 100, qtyMax: 200, perUnitCost: 0.65, setupCost: 80 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 200, qtyMax: 300, perUnitCost: 0.61, setupCost: 80 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 300, qtyMax: 400, perUnitCost: 0.54, setupCost: 80 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 400, qtyMax: 500, perUnitCost: 0.52, setupCost: 80 },
    { pageRangeMin: 76, pageRangeMax: 152, qtyMin: 500, qtyMax: 99999, perUnitCost: 0.48, setupCost: 80 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 25, qtyMax: 50, perUnitCost: 0.77, setupCost: 80 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 100, qtyMax: 200, perUnitCost: 0.75, setupCost: 80 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 200, qtyMax: 300, perUnitCost: 0.73, setupCost: 80 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 300, qtyMax: 400, perUnitCost: 0.70, setupCost: 80 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 400, qtyMax: 500, perUnitCost: 0.60, setupCost: 80 },
    { pageRangeMin: 152, pageRangeMax: 280, qtyMin: 500, qtyMax: 99999, perUnitCost: 0.56, setupCost: 80 },
  ];

  // Piqure (2 points métal) — digital price tiers
  // Source: Tableau_Façonnage_Num.csv lines 15-20
  // Piqure digital tiers — Source: Tableau_Façonnage_Num.csv lines 22-25
  // XLSM has exactly 2 tiers: <200 qty and ≥200 qty
  const piqureDigitalTiers: BindingTier[] = [
    { pageRangeMin: 4, pageRangeMax: 96, qtyMin: 1, qtyMax: 199, perUnitCost: 0.28, setupCost: 35 },
    { pageRangeMin: 4, pageRangeMax: 96, qtyMin: 200, qtyMax: 99999, perUnitCost: 0.24, setupCost: 25 },
  ];

  for (const tier of piqureDigitalTiers) {
    await prisma.bindingPriceTierDigital.create({
      data: { bindingTypeId: bindingTypes["Piqure"].id, ...tier },
    });
  }
  for (const tier of dosCarreColleTiers) {
    await prisma.bindingPriceTierDigital.create({
      data: { bindingTypeId: bindingTypes["Dos carre colle"].id, ...tier },
    });
  }
  for (const tier of dosCarreCollePURTiers) {
    await prisma.bindingPriceTierDigital.create({
      data: { bindingTypeId: bindingTypes["Dos carre colle PUR"].id, ...tier },
    });
  }
  console.log(
    `📎 ${piqureDigitalTiers.length + dosCarreColleTiers.length + dosCarreCollePURTiers.length} binding digital price tiers created`
  );

  // ── 6b. Binding Types – Offset Price Tiers ────────────────────────────────
  // Source: Tableau_Façonnage_OFFSET.csv
  // Piqure: columns = cahiers, calage (1er mille), roulage/1000 (1-5k), roulage/1000 (>5k)
  // We store two rows per cahier count: one for <=5000 qty (standard), one for >5000 qty
  type OffsetBindingTierSeed = { cahiersCount: number; calageCost: number; roulagePer1000: number };

  const piqureOffsetTiers: OffsetBindingTierSeed[] = [
    { cahiersCount: 1, calageCost: 73,  roulagePer1000: 31 },
    { cahiersCount: 2, calageCost: 93,  roulagePer1000: 49 },
    { cahiersCount: 3, calageCost: 112, roulagePer1000: 63 },
    { cahiersCount: 4, calageCost: 133, roulagePer1000: 84 },
    { cahiersCount: 5, calageCost: 156, roulagePer1000: 115 },
    { cahiersCount: 6, calageCost: 182, roulagePer1000: 132 },
    { cahiersCount: 7, calageCost: 275, roulagePer1000: 163 },
  ];

  // Dos carré collé sans couture: cahiers+CV (2 to 24+), calage, roulage/1000
  // Source: rows 3-32 of Tableau_Façonnage_OFFSET, column 1 (Cahiers+CV), 2 (Calage), 3 (Roulage/1000)
  const dosCarreColleOffsetTiers: OffsetBindingTierSeed[] = [
    { cahiersCount: 2,  calageCost: 215.25, roulagePer1000: 91 },
    { cahiersCount: 3,  calageCost: 218.40, roulagePer1000: 97 },
    { cahiersCount: 4,  calageCost: 221.55, roulagePer1000: 109 },
    { cahiersCount: 5,  calageCost: 223.65, roulagePer1000: 118 },
    { cahiersCount: 6,  calageCost: 225.75, roulagePer1000: 128 },
    { cahiersCount: 7,  calageCost: 231.00, roulagePer1000: 151 },
    { cahiersCount: 8,  calageCost: 234.15, roulagePer1000: 163 },
    { cahiersCount: 9,  calageCost: 237.30, roulagePer1000: 197 },
    { cahiersCount: 10, calageCost: 240.45, roulagePer1000: 204 },
    { cahiersCount: 11, calageCost: 244.65, roulagePer1000: 209 },
    { cahiersCount: 12, calageCost: 246.75, roulagePer1000: 216 },
    { cahiersCount: 13, calageCost: 250.95, roulagePer1000: 233 },
    { cahiersCount: 14, calageCost: 254.10, roulagePer1000: 245 },
    { cahiersCount: 15, calageCost: 257.25, roulagePer1000: 255 },
    { cahiersCount: 16, calageCost: 260.40, roulagePer1000: 261 },
    { cahiersCount: 17, calageCost: 263.55, roulagePer1000: 278 },
    { cahiersCount: 18, calageCost: 267.75, roulagePer1000: 289 },
    { cahiersCount: 19, calageCost: 271.95, roulagePer1000: 300 },
    { cahiersCount: 20, calageCost: 274.05, roulagePer1000: 310 },
    { cahiersCount: 21, calageCost: 277.20, roulagePer1000: 322 },
    { cahiersCount: 22, calageCost: 280.35, roulagePer1000: 334 },
    { cahiersCount: 23, calageCost: 284.55, roulagePer1000: 347 },
    { cahiersCount: 24, calageCost: 287.70, roulagePer1000: 359 },
    // Per additional cahier beyond 24 (encoded as cahiersCount: 25 = "+1" row)
    { cahiersCount: 25, calageCost: 4.20,   roulagePer1000: 12 },
  ];

  // Dos carré collé avec couture: same structure, different prices
  const dosCarreColleAvecCoutureOffsetTiers: OffsetBindingTierSeed[] = [
    { cahiersCount: 2,  calageCost: 489.28, roulagePer1000: 136.73 },
    { cahiersCount: 3,  calageCost: 520.92, roulagePer1000: 150.29 },
    { cahiersCount: 4,  calageCost: 534.48, roulagePer1000: 166.11 },
    { cahiersCount: 5,  calageCost: 551.43, roulagePer1000: 187.58 },
    { cahiersCount: 6,  calageCost: 575.16, roulagePer1000: 207.92 },
    { cahiersCount: 7,  calageCost: 587.59, roulagePer1000: 232.78 },
    { cahiersCount: 8,  calageCost: 609.06, roulagePer1000: 255.38 },
    { cahiersCount: 9,  calageCost: 616.97, roulagePer1000: 307.36 },
    { cahiersCount: 10, calageCost: 622.62, roulagePer1000: 320.92 },
    { cahiersCount: 11, calageCost: 652.00, roulagePer1000: 335.61 },
    { cahiersCount: 12, calageCost: 691.55, roulagePer1000: 349.17 },
    { cahiersCount: 13, calageCost: 734.49, roulagePer1000: 381.94 },
    { cahiersCount: 14, calageCost: 763.87, roulagePer1000: 409.06 },
    { cahiersCount: 15, calageCost: 786.47, roulagePer1000: 426.01 },
    // Per additional cahier
    { cahiersCount: 16, calageCost: 22.60,  roulagePer1000: 21.47 },
  ];

  // Dos carré collé PUR: same structure, different prices
  const dosCarreCollePUROffsetTiers: OffsetBindingTierSeed[] = [
    { cahiersCount: 2,  calageCost: 320.25, roulagePer1000: 95.55 },
    { cahiersCount: 3,  calageCost: 348.60, roulagePer1000: 101.85 },
    { cahiersCount: 4,  calageCost: 364.35, roulagePer1000: 114.45 },
    { cahiersCount: 5,  calageCost: 378.00, roulagePer1000: 123.90 },
    { cahiersCount: 6,  calageCost: 401.10, roulagePer1000: 134.40 },
    { cahiersCount: 7,  calageCost: 413.70, roulagePer1000: 158.55 },
    { cahiersCount: 8,  calageCost: 433.65, roulagePer1000: 171.15 },
    { cahiersCount: 9,  calageCost: 438.90, roulagePer1000: 206.85 },
    { cahiersCount: 10, calageCost: 446.25, roulagePer1000: 214.20 },
    { cahiersCount: 11, calageCost: 472.50, roulagePer1000: 219.45 },
    { cahiersCount: 12, calageCost: 508.20, roulagePer1000: 226.80 },
    { cahiersCount: 13, calageCost: 547.05, roulagePer1000: 244.65 },
    { cahiersCount: 14, calageCost: 574.35, roulagePer1000: 257.25 },
    { cahiersCount: 15, calageCost: 590.10, roulagePer1000: 267.75 },
    { cahiersCount: 16, calageCost: 620.55, roulagePer1000: 274.05 },
    { cahiersCount: 17, calageCost: 636.30, roulagePer1000: 291.90 },
    { cahiersCount: 18, calageCost: 660.45, roulagePer1000: 303.45 },
    { cahiersCount: 19, calageCost: 669.90, roulagePer1000: 315.00 },
    { cahiersCount: 20, calageCost: 696.15, roulagePer1000: 325.50 },
    { cahiersCount: 21, calageCost: 717.15, roulagePer1000: 338.10 },
    { cahiersCount: 22, calageCost: 738.15, roulagePer1000: 350.70 },
    { cahiersCount: 23, calageCost: 759.15, roulagePer1000: 364.35 },
    { cahiersCount: 24, calageCost: 780.15, roulagePer1000: 376.95 },
    { cahiersCount: 25, calageCost: 799.05, roulagePer1000: 389.55 },
    { cahiersCount: 26, calageCost: 821.10, roulagePer1000: 402.15 },
    { cahiersCount: 27, calageCost: 842.10, roulagePer1000: 414.75 },
    // Per additional cahier
    { cahiersCount: 28, calageCost: 21.00,  roulagePer1000: 15.75 },
  ];

  let offsetBindingTierCount = 0;
  for (const tier of piqureOffsetTiers) {
    await prisma.bindingPriceTierOffset.create({
      data: { bindingTypeId: bindingTypes["Piqure"].id, ...tier },
    });
    offsetBindingTierCount++;
  }
  for (const tier of dosCarreColleOffsetTiers) {
    await prisma.bindingPriceTierOffset.create({
      data: { bindingTypeId: bindingTypes["Dos carre colle"].id, ...tier },
    });
    offsetBindingTierCount++;
  }
  for (const tier of dosCarreColleAvecCoutureOffsetTiers) {
    await prisma.bindingPriceTierOffset.create({
      data: { bindingTypeId: bindingTypes["Dos carre colle avec couture"].id, ...tier },
    });
    offsetBindingTierCount++;
  }
  for (const tier of dosCarreCollePUROffsetTiers) {
    await prisma.bindingPriceTierOffset.create({
      data: { bindingTypeId: bindingTypes["Dos carre colle PUR"].id, ...tier },
    });
    offsetBindingTierCount++;
  }
  console.log(`📎 ${offsetBindingTierCount} binding offset price tiers created`);

  // ── 7. Fold Types + Costs ────────────────────────────────────────────────
  const foldTypesData = [
    { name: "Pli Roule", maxFolds: 6, canBeSecondary: false },
    { name: "Pli Accordeon", maxFolds: 6, canBeSecondary: false },
    { name: "Pli Croise", maxFolds: 6, canBeSecondary: true },
    { name: "Pli Economique", maxFolds: 4, canBeSecondary: false },
  ];

  // XLSM Tableau_Façonnage_OFFSET: these are per-1000 rates (roulage/1000).
  // The engine adds a fixed calage of 20 EUR: foldCost = 20 + (qty/1000) * rate.
  // 1-2 plis: 22.5/1000, 3+ plis: 45.0/1000 (Excel rows 7-15).
  const foldCostsData = [
    { numFolds: 1, cost: 22.5 },
    { numFolds: 2, cost: 22.5 },
    { numFolds: 3, cost: 45.0 },
    { numFolds: 4, cost: 45.0 },
    { numFolds: 5, cost: 45.0 },
    { numFolds: 6, cost: 45.0 },
    { numFolds: 7, cost: 45.0 },
    { numFolds: 8, cost: 45.0 },
  ];

  let foldCostCount = 0;
  for (const ft of foldTypesData) {
    let foldType = await prisma.foldType.findFirst({ where: { fournisseurId: null, name: ft.name } });
    if (!foldType) foldType = await prisma.foldType.create({ data: { ...ft } });

    for (const fc of foldCostsData) {
      await prisma.foldCost.upsert({
        where: { foldTypeId_numFolds: { foldTypeId: foldType.id, numFolds: fc.numFolds } },
        update: {},
        create: { foldTypeId: foldType.id, ...fc },
      });
      foldCostCount++;
    }
  }
  console.log(`🔄 ${foldTypesData.length} fold types + ${foldCostCount} fold costs created`);

  // ── 8. Lamination Modes ──────────────────────────────────────────────────
  const laminationModes = ["Rien", "Pelliculage Recto", "Pelliculage Recto Verso"];
  for (const name of laminationModes) {
    const row = await prisma.laminationMode.findFirst({ where: { fournisseurId: null, name } });
    if (!row) await prisma.laminationMode.create({ data: { name } });
  }
  console.log(`✨ ${laminationModes.length} lamination modes created`);

  // ── 9. Lamination Finishes + Digital Tiers ───────────────────────────────
  // Source: Tableau_Façonnage_OFFSET.csv — Pelliculage IMB section
  // Brillant = 0.25 €/m², Mat = 0.30 €/m², Soft Touch = 0.50 €/m²
  const laminationFinishesData = [
    { name: "Brillant", offsetPricePerM2: 0.25, offsetCalageForfait: 55.0, offsetMinimumBilling: 60.0 },
    { name: "Mat", offsetPricePerM2: 0.30, offsetCalageForfait: 55.0, offsetMinimumBilling: 115.0 },
    { name: "Soft Touch", offsetPricePerM2: 0.50, offsetCalageForfait: 55.0, offsetMinimumBilling: 115.0 },
  ];

  const laminationDigitalTiers = [
    { qtyMin: 100, qtyMax: 299, pricePerSheet: 0.13, setupCost: 25 },
    { qtyMin: 300, qtyMax: 499, pricePerSheet: 0.12, setupCost: 25 },
    { qtyMin: 500, qtyMax: 999, pricePerSheet: 0.09, setupCost: 25 },
    { qtyMin: 1000, qtyMax: 2499, pricePerSheet: 0.08, setupCost: 25 },
    { qtyMin: 2500, qtyMax: 4999, pricePerSheet: 0.08, setupCost: 25 },
    { qtyMin: 5000, qtyMax: 9999, pricePerSheet: 0.06, setupCost: 25 },
    { qtyMin: 10000, qtyMax: 99999, pricePerSheet: 0.06, setupCost: 40 },
  ];

  let lamTierCount = 0;
  for (const lf of laminationFinishesData) {
    let finish = await prisma.laminationFinish.findFirst({ where: { fournisseurId: null, name: lf.name } });
    if (!finish) finish = await prisma.laminationFinish.create({ data: { ...lf } });

    for (const tier of laminationDigitalTiers) {
      await prisma.laminationPriceTier.create({
        data: { finishId: finish.id, ...tier },
      });
      lamTierCount++;
    }
  }
  console.log(
    `✨ ${laminationFinishesData.length} lamination finishes + ${lamTierCount} digital tiers created`
  );

  // ── 10. Packaging Options ────────────────────────────────────────────────
  // Source: Tableau_Façonnage_OFFSET.csv — Conditionnement section
  // Film: 0.25€/unit (base), Cartons: 0.45€/unit, Elastiques: 0.10€/unit, Crystal: 0.56€/unit
  const packagingData = [
    { name: "Mise en cartons", type: "CARTON", costPerUnit: 0.45, costPerOrder: 0, appliesTo: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
    { name: "Mise sous film", type: "FILM", costPerUnit: 0.25, costPerOrder: 0, appliesTo: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
    { name: "Mise sous elastiques par paquet", type: "ELASTIQUE", costPerUnit: 0.10, costPerOrder: 0, appliesTo: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
    { name: "Boite cristal", type: "CRYSTAL_BOX", costPerUnit: 0.56, costPerOrder: 0, appliesTo: ["DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
  ];

  for (const pkg of packagingData) {
    const row = await prisma.packagingOption.findFirst({ where: { fournisseurId: null, name: pkg.name } });
    if (!row) await prisma.packagingOption.create({ data: { ...pkg } });
  }
  console.log(`📦 ${packagingData.length} packaging options created`);

  // ── 11. French Departments ───────────────────────────────────────────────
  const departmentsRaw: { code: string; name: string; zone: number; isSpecialZone?: boolean }[] = [
    // Zone 1
    { code: "14", name: "Calvados", zone: 1 },
    // Zone 2
    { code: "27", name: "Eure", zone: 2 },
    { code: "50", name: "Manche", zone: 2 },
    { code: "61", name: "Orne", zone: 2 },
    { code: "76", name: "Seine-Maritime", zone: 2 },
    // Zone 3
    { code: "02", name: "Aisne", zone: 3 },
    { code: "22", name: "Cotes-d'Armor", zone: 3 },
    { code: "28", name: "Eure-et-Loir", zone: 3 },
    { code: "29", name: "Finistere", zone: 3 },
    { code: "35", name: "Ille-et-Vilaine", zone: 3 },
    { code: "37", name: "Indre-et-Loire", zone: 3 },
    { code: "41", name: "Loir-et-Cher", zone: 3 },
    { code: "44", name: "Loire-Atlantique", zone: 3 },
    { code: "45", name: "Loiret", zone: 3 },
    { code: "49", name: "Maine-et-Loire", zone: 3 },
    { code: "53", name: "Mayenne", zone: 3 },
    { code: "56", name: "Morbihan", zone: 3 },
    { code: "59", name: "Nord", zone: 3 },
    { code: "60", name: "Oise", zone: 3 },
    { code: "62", name: "Pas-de-Calais", zone: 3 },
    { code: "72", name: "Sarthe", zone: 3 },
    { code: "75", name: "Paris", zone: 3 },
    { code: "77", name: "Seine-et-Marne", zone: 3 },
    { code: "78", name: "Yvelines", zone: 3 },
    { code: "80", name: "Somme", zone: 3 },
    { code: "91", name: "Essonne", zone: 3 },
    { code: "92", name: "Hauts-de-Seine", zone: 3 },
    { code: "93", name: "Seine-Saint-Denis", zone: 3 },
    { code: "94", name: "Val-de-Marne", zone: 3 },
    { code: "95", name: "Val-d'Oise", zone: 3 },
    // Zone 4
    { code: "01", name: "Ain", zone: 4 },
    { code: "03", name: "Allier", zone: 4 },
    { code: "08", name: "Ardennes", zone: 4 },
    { code: "10", name: "Aube", zone: 4 },
    { code: "15", name: "Cantal", zone: 4 },
    { code: "16", name: "Charente", zone: 4 },
    { code: "17", name: "Charente-Maritime", zone: 4 },
    { code: "18", name: "Cher", zone: 4 },
    { code: "19", name: "Correze", zone: 4 },
    { code: "21", name: "Cote-d'Or", zone: 4 },
    { code: "23", name: "Creuse", zone: 4 },
    { code: "24", name: "Dordogne", zone: 4 },
    { code: "25", name: "Doubs", zone: 4 },
    { code: "36", name: "Indre", zone: 4 },
    { code: "39", name: "Jura", zone: 4 },
    { code: "42", name: "Loire", zone: 4 },
    { code: "43", name: "Haute-Loire", zone: 4 },
    { code: "46", name: "Lot", zone: 4 },
    { code: "51", name: "Marne", zone: 4 },
    { code: "52", name: "Haute-Marne", zone: 4 },
    { code: "54", name: "Meurthe-et-Moselle", zone: 4 },
    { code: "55", name: "Meuse", zone: 4 },
    { code: "57", name: "Moselle", zone: 4 },
    { code: "58", name: "Nievre", zone: 4 },
    { code: "63", name: "Puy-de-Dome", zone: 4 },
    { code: "67", name: "Bas-Rhin", zone: 4 },
    { code: "68", name: "Haut-Rhin", zone: 4 },
    { code: "69", name: "Rhone", zone: 4 },
    { code: "70", name: "Haute-Saone", zone: 4 },
    { code: "71", name: "Saone-et-Loire", zone: 4 },
    { code: "79", name: "Deux-Sevres", zone: 4 },
    { code: "85", name: "Vendee", zone: 4 },
    { code: "86", name: "Vienne", zone: 4 },
    { code: "87", name: "Haute-Vienne", zone: 4 },
    { code: "88", name: "Vosges", zone: 4 },
    { code: "89", name: "Yonne", zone: 4 },
    { code: "90", name: "Territoire de Belfort", zone: 4 },
    // Zone 5
    { code: "04", name: "Alpes-de-Haute-Provence", zone: 5 },
    { code: "05", name: "Hautes-Alpes", zone: 5 },
    { code: "06", name: "Alpes-Maritimes", zone: 5 },
    { code: "07", name: "Ardeche", zone: 5 },
    { code: "09", name: "Ariege", zone: 5 },
    { code: "11", name: "Aude", zone: 5 },
    { code: "12", name: "Aveyron", zone: 5 },
    { code: "13", name: "Bouches-du-Rhone", zone: 5 },
    { code: "26", name: "Drome", zone: 5 },
    { code: "30", name: "Gard", zone: 5 },
    { code: "31", name: "Haute-Garonne", zone: 5 },
    { code: "32", name: "Gers", zone: 5 },
    { code: "33", name: "Gironde", zone: 5 },
    { code: "34", name: "Herault", zone: 5 },
    { code: "38", name: "Isere", zone: 5 },
    { code: "40", name: "Landes", zone: 5 },
    { code: "47", name: "Lot-et-Garonne", zone: 5 },
    { code: "48", name: "Lozere", zone: 5 },
    { code: "64", name: "Pyrenees-Atlantiques", zone: 5 },
    { code: "65", name: "Hautes-Pyrenees", zone: 5 },
    { code: "66", name: "Pyrenees-Orientales", zone: 5 },
    { code: "73", name: "Savoie", zone: 5 },
    { code: "74", name: "Haute-Savoie", zone: 5 },
    { code: "81", name: "Tarn", zone: 5 },
    { code: "82", name: "Tarn-et-Garonne", zone: 5 },
    { code: "83", name: "Var", zone: 5 },
    { code: "84", name: "Vaucluse", zone: 5 },
    // Corsica (special zone)
    { code: "2A", name: "Corse-du-Sud", zone: 5, isSpecialZone: true },
    { code: "2B", name: "Haute-Corse", zone: 5, isSpecialZone: true },
  ];

  for (const dept of departmentsRaw) {
    await prisma.department.upsert({
      where: { code: dept.code },
      update: {},
      create: {
        code: dept.code,
        name: dept.name,
        zone: dept.zone,
        isSpecialZone: dept.isSpecialZone ?? false,
        displayName: `${dept.code} - ${dept.name}`,
      },
    });
  }
  console.log(`🗺️  ${departmentsRaw.length} departments created`);

  // ── 12. Carriers + Delivery Rates ────────────────────────────────────────
  // Gandon first (default for Excel-aligned livraison); then France EXPRESS, TNT.
  let gandon = await prisma.carrier.findFirst({ where: { fournisseurId: null, name: "Gandon" } });
  if (!gandon) gandon = await prisma.carrier.create({ data: { name: "Gandon", active: true } });
  let franceExpress = await prisma.carrier.findFirst({ where: { fournisseurId: null, name: "France EXPRESS" } });
  if (!franceExpress) franceExpress = await prisma.carrier.create({ data: { name: "France EXPRESS", active: true } });
  let tnt = await prisma.carrier.findFirst({ where: { fournisseurId: null, name: "TNT" } });
  if (!tnt) tnt = await prisma.carrier.create({ data: { name: "TNT", active: true } });
  console.log(`🚚 3 carriers created (Gandon, France EXPRESS, TNT)`);

  // France EXPRESS rates: [maxWeightKg, zone1, zone2, zone3, zone4, zone5]
  const expressRateRows: [number, number, number, number, number, number][] = [
    [5, 13.14, 21.74, 27.16, 31.9, 32.88],
    [10, 20.63, 23.0, 28.96, 37.68, 38.79],
    [20, 20.63, 23.0, 32.18, 50.16, 51.69],
    [30, 20.63, 23.0, 35.15, 60.21, 62.03],
    [40, 20.63, 23.0, 38.58, 72.78, 74.94],
    [50, 20.63, 23.0, 41.94, 85.31, 87.89],
    [60, 20.63, 41.23, 45.41, 98.05, 101.03],
    [70, 20.63, 41.23, 48.83, 111.29, 114.61],
    [80, 20.63, 41.23, 54.3, 124.71, 128.46],
    [90, 20.63, 41.23, 59.51, 138.18, 142.29],
    [100, 20.63, 41.23, 62.96, 156.18, 160.88],
    [9999, 28.11, 54.19, 62.96, 156.18, 160.88],
  ];

  let rateCount = 0;
  for (const [maxWeightKg, z1, z2, z3, z4, z5] of expressRateRows) {
    const zonePrices = [z1, z2, z3, z4, z5];
    for (let zone = 1; zone <= 5; zone++) {
      await prisma.deliveryRate.upsert({
        where: {
          carrierId_zone_maxWeightKg: {
            carrierId: franceExpress.id,
            zone,
            maxWeightKg,
          },
        },
        update: {},
        create: {
          carrierId: franceExpress.id,
          zone,
          maxWeightKg,
          price: zonePrices[zone - 1],
        },
      });
      rateCount++;
    }
  }
  console.log(`🚚 ${rateCount} delivery rates created for France EXPRESS`);

  // ── 12b. Per-Department Delivery Rates (Transports.csv) ──────────────────
  // Parse the XLSM Transports.csv: columns = Département, Transporteur, <weight1>, <weight2>…
  // Each row = one department; create one TransportRateByDept record per (dept, maxWeightKg).
  try {
    const csvPath = path.join(__dirname, "..", "docs", "sheets", "Transports.csv");
    const csvContent = fs.readFileSync(csvPath, "utf-8");
    const lines = csvContent.split("\n").filter(l => l.trim());
    const headers = lines[0].split(",");
    // Weight bracket headers start at index 2 (0=Département, 1=Transporteur)
    const weightHeaders: number[] = [];
    for (let i = 2; i < headers.length; i++) {
      const w = parseFloat(headers[i]);
      if (!isNaN(w)) weightHeaders.push(w);
      else break; // stop at non-numeric headers (Au 100 kg, etc.)
    }

    const deptRateBatch: { carrierId: string; departmentCode: string; maxWeightKg: number; price: number }[] = [];
    for (let rowIdx = 1; rowIdx < lines.length; rowIdx++) {
      const cols = lines[rowIdx].split(",");
      const deptCode = (cols[0] ?? "").trim();
      const transporteurName = (cols[1] ?? "").trim();
      if (!deptCode || !transporteurName) continue;

      // Import Gandon (default for Excel) and France EXPRESS (legacy)
      const tl = transporteurName.toLowerCase();
      const carrier =
        tl.includes("gandon") ? gandon
        : tl.includes("france express") ? franceExpress
        : null;
      if (!carrier) continue;

      for (let wi = 0; wi < weightHeaders.length; wi++) {
        const rawVal = (cols[wi + 2] ?? "").trim();
        if (!rawVal || rawVal.toLowerCase() === "vide") continue;
        const price = parseFloat(rawVal);
        if (isNaN(price) || price <= 0) continue;
        deptRateBatch.push({
          carrierId: carrier.id,
          departmentCode: deptCode,
          maxWeightKg: weightHeaders[wi],
          price,
        });
      }
    }

    // Batch insert in chunks of 500
    const CHUNK = 500;
    let deptRateCount = 0;
    for (let i = 0; i < deptRateBatch.length; i += CHUNK) {
      const chunk = deptRateBatch.slice(i, i + CHUNK);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (prisma as any).transportRateByDept.createMany({ data: chunk, skipDuplicates: true });
      deptRateCount += chunk.length;
    }
    console.log(`🗺️  ${deptRateCount} per-department delivery rates imported from Transports.csv`);
  } catch (err) {
    console.warn("⚠️  Could not import Transports.csv per-department rates:", (err as Error).message);
  }

  // ── 13. Offset Config (XLSM-aligned) ─────────────────────────────────────
  const offsetConfigData = [
    { key: "plate_cost", value: 11.0, unit: "EUR", description: "Cost per aluminum plate (XLSM)" },
    { key: "plate_cost_large", value: 17.4, unit: "EUR", description: "Cost per plate (large format)" },
    { key: "calage_per_plate", value: 6.0, unit: "EUR", description: "Calibration cost per plate" },
    { key: "calage_vernis", value: 6.0, unit: "EUR", description: "Varnish calibration cost" },
    { key: "recherche_teinte", value: 10.0, unit: "EUR", description: "Color matching cost" },
    { key: "file_processing_per_treatment", value: 12.5, unit: "EUR", description: "Flat fee per treatment (interior=1, cover=1)" },
    { key: "file_processing_base", value: 12.5, unit: "EUR", description: "Legacy base file processing fee" },
    { key: "file_processing_per_plate", value: 0, unit: "EUR", description: "XLSM: no per-plate; use per-treatment" },
    { key: "gache_calage", value: 70, unit: "sheets", description: "Waste sheets per plate (calibration)" },
    { key: "gache_recherche_teinte", value: 100, unit: "sheets", description: "Waste sheets for color matching" },
    { key: "gache_tirage_pct", value: 0.02, unit: "ratio", description: "Legacy flat running waste" },
    { key: "gache_tirage_pct_3k", value: 0.002, unit: "ratio", description: "Running waste ≤3000 sheets (0.2%)" },
    { key: "gache_tirage_pct_5k", value: 0.005, unit: "ratio", description: "Running waste ≤5000 sheets (0.5%)" },
    { key: "gache_tirage_pct_8k", value: 0.006, unit: "ratio", description: "Running waste ≤8000 sheets (0.6%)" },
    { key: "gache_tirage_pct_10k", value: 0.008, unit: "ratio", description: "Running waste ≤10000 sheets (0.8%)" },
    { key: "gache_vernis", value: 2, unit: "sheets", description: "Waste sheets for varnish per plate" },
    { key: "running_cost_tier_1", value: 15.0, unit: "EUR/1000", description: "≤1000 sheets (XLSM: 15)" },
    { key: "running_cost_tier_2", value: 15.0, unit: "EUR/1000", description: "1001-3000 sheets (XLSM: 15)" },
    { key: "running_cost_tier_3", value: 15.0, unit: "EUR/1000", description: "3001-5000 sheets" },
    { key: "running_cost_tier_4", value: 15.0, unit: "EUR/1000", description: "5001-10000 sheets" },
    { key: "running_cost_tier_5", value: 15.0, unit: "EUR/1000", description: "10001-12000 sheets" },
    { key: "running_cost_tier_6", value: 15.0, unit: "EUR/1000", description: ">12000 sheets (XLSM 6th tier)" },
    { key: "running_cost_vernis", value: 22.0, unit: "EUR/1000", description: "Varnish running cost per 1000 tours (XLSM: 22)" },
    { key: "gache_recherche_teinte", value: 100, unit: "sheets", description: "Waste sheets for color matching" },
    { key: "fixed_setup_flat", value: 50.0, unit: "EUR", description: "Fixed setup cost for flat products (Cout fixe)" },

    // ── Rainage (creasing) tiers — §4.10, Façonnage_OFFSET rows 29-30 ──
    { key: "rainage_calage_1", value: 25, unit: "EUR", description: "Rainage calage for 1 cahier" },
    { key: "rainage_roulage_1", value: 17, unit: "EUR/1000", description: "Rainage roulage/1000 for 1 cahier" },
    { key: "rainage_calage_2", value: 25, unit: "EUR", description: "Rainage calage for 2 cahiers" },
    { key: "rainage_roulage_2", value: 35, unit: "EUR/1000", description: "Rainage roulage/1000 for 2 cahiers" },
    { key: "rainage_calage_3", value: 25, unit: "EUR", description: "Rainage calage for 3 cahiers" },
    { key: "rainage_roulage_3", value: 45, unit: "EUR/1000", description: "Rainage roulage/1000 for 3 cahiers" },
    { key: "rainage_calage_4", value: 25, unit: "EUR", description: "Rainage calage for 4 cahiers" },
    { key: "rainage_roulage_4", value: 50, unit: "EUR/1000", description: "Rainage roulage/1000 for 4 cahiers" },
    { key: "rainage_calage_5", value: 35, unit: "EUR", description: "Rainage calage for 5 cahiers" },
    { key: "rainage_roulage_5", value: 75, unit: "EUR/1000", description: "Rainage roulage/1000 for 5 cahiers" },
    { key: "rainage_calage_6", value: 35, unit: "EUR", description: "Rainage calage for 6 cahiers" },
    { key: "rainage_roulage_6", value: 95, unit: "EUR/1000", description: "Rainage roulage/1000 for 6 cahiers" },
    { key: "rainage_calage_7", value: 55, unit: "EUR", description: "Rainage calage for 7+ cahiers" },
    { key: "rainage_roulage_7", value: 120, unit: "EUR/1000", description: "Rainage roulage/1000 for 7+ cahiers" },

    // ── Binding supplement rates — Façonnage_OFFSET rows 25-38 ──
    { key: "supplement_papier_lt70g", value: 0.20, unit: "ratio", description: "Binding surcharge: interior paper <70g (+20%)" },
    { key: "supplement_couche_satin_gt115g", value: 0.05, unit: "ratio", description: "Binding surcharge: couché satin >115g (+5%)" },
    { key: "supplement_couche_mat_gt115g", value: 0.15, unit: "ratio", description: "Binding surcharge: couché mat >115g (+15%)" },
    { key: "supplement_1_encart", value: 0.05, unit: "ratio", description: "Binding surcharge: 1 cahier encarté (+5%)" },
    { key: "supplement_2_encarts", value: 0.10, unit: "ratio", description: "Binding surcharge: 2+ cahiers encartés (+10%)" },
    { key: "supplement_dos_hors_range", value: 0.20, unit: "ratio", description: "Binding surcharge: spine <3mm or >35mm (+20%)" },
    { key: "supplement_cahiers_melanges", value: 0.20, unit: "ratio", description: "Binding surcharge: mixed cahiers (+20%)" },
    // Binding supplement thresholds
    { key: "supplement_grammage_min", value: 70, unit: "g/m²", description: "Grammage threshold for <70g surcharge" },
    { key: "supplement_couche_grammage_min", value: 115, unit: "g/m²", description: "Grammage threshold for couché surcharges" },
    { key: "supplement_dos_min_mm", value: 3, unit: "mm", description: "Min spine thickness for normal range" },
    { key: "supplement_dos_max_mm", value: 35, unit: "mm", description: "Max spine thickness for normal range" },
    { key: "supplement_papier_gt170g", value: 0.15, unit: "ratio", description: "Binding surcharge PUR: interior >170g (+15%)" },

    // ── Finishing extras — UV Varnish (§11) ──
    { key: "uv_rate_small_per_mille", value: 170, unit: "EUR/1000", description: "UV varnish rate/1000 for format <50×70" },
    { key: "uv_rate_large_per_mille", value: 130, unit: "EUR/1000", description: "UV varnish rate/1000 for format ≥50×70" },
    { key: "uv_calage_small", value: 160, unit: "EUR", description: "UV varnish calage for sheet area <35×50" },
    { key: "uv_calage_medium", value: 260, unit: "EUR", description: "UV varnish calage for 35×50 to 50×70" },
    { key: "uv_calage_large", value: 350, unit: "EUR", description: "UV varnish calage for >50×70" },
    { key: "uv_small_max_width", value: 50, unit: "cm", description: "UV small format max width threshold" },
    { key: "uv_small_max_height", value: 70, unit: "cm", description: "UV small format max height threshold" },

    // ── Finishing extras — Encart jeté (§12) ──
    { key: "encart_aleatoire_per_mille", value: 37, unit: "EUR/1000", description: "Random insert cost per 1000" },
    { key: "encart_non_aleatoire_per_mille", value: 50, unit: "EUR/1000", description: "Positioned insert cost per 1000" },

    // ── Finishing extras — Recassage (§13) ──
    { key: "recassage_calage", value: 26, unit: "EUR", description: "Recassage calage forfait" },
    { key: "recassage_roulage_per_mille", value: 13, unit: "EUR/1000", description: "Recassage roulage per 1000" },

    // ── Finishing extras — Rabats (§4.11) ──
    { key: "rabat_1_volet_per_mille", value: 50, unit: "EUR/1000", description: "1 flap cost per 1000" },
    { key: "rabat_2_volets_per_mille", value: 70, unit: "EUR/1000", description: "2 flaps cost per 1000" },

    // ── Packaging defaults — Conditionnement ──
    { key: "film_rate_1x", value: 0.25, unit: "EUR/unit", description: "Film wrapping per unit (1x)" },
    { key: "film_rate_2x", value: 0.17, unit: "EUR/unit", description: "Film wrapping per unit (2x pack)" },
    { key: "film_rate_3x", value: 0.12, unit: "EUR/unit", description: "Film wrapping per unit (3x pack)" },
    { key: "film_rate_4x", value: 0.10, unit: "EUR/unit", description: "Film wrapping per unit (4+ pack)" },
    { key: "film_rate_10x", value: 0.08, unit: "EUR/unit", description: "Film wrapping per unit (10+ pack)" },
    { key: "cartons_kg_per_carton", value: 10, unit: "kg", description: "Weight capacity per carton" },
    { key: "cartons_price_per_unit", value: 1.0, unit: "EUR", description: "Default carton price" },
    { key: "palette_price_per_unit", value: 10, unit: "EUR", description: "Cost per palette" },
    { key: "palette_weight_threshold", value: 500, unit: "kg", description: "Weight threshold for additional palettes" },
    { key: "elastiques_minimum", value: 5, unit: "EUR", description: "Minimum elastiques cost" },
    { key: "elastiques_per_unit", value: 0.01, unit: "EUR", description: "Elastiques cost per unit" },
    { key: "crystal_box_per_unit", value: 2.22, unit: "EUR", description: "Crystal box minimum per box" },

    // ── Cover supplement ──
    { key: "cover_supplement_per_mille", value: 13, unit: "EUR/1000", description: "Cover calage supplement per 1000 for binding" },

    // ── Pli (fold) calage forfait ──
    { key: "fold_calage_forfait", value: 20, unit: "EUR", description: "Fold calage forfait (fixed cost)" },

    // ── Per-component discount rates (XLSM Détails PRIX remise system) ──
    // These apply AFTER computing each cost component: final = base × (1 - discount)
    { key: "discount_plates", value: 0.25, unit: "ratio", description: "Plate cost discount (XLSM: 25% off)" },
    { key: "discount_calage", value: 0.10, unit: "ratio", description: "Calage cost discount (XLSM: 10% off)" },
    { key: "discount_roulage", value: 0.10, unit: "ratio", description: "Roulage cost discount (XLSM: 10% off)" },
    { key: "discount_fichiers", value: 0.50, unit: "ratio", description: "File processing discount (XLSM: 50% off)" },
    { key: "discount_faconnage", value: 0.10, unit: "ratio", description: "Binding/finishing discount (XLSM: 10% off)" },
    { key: "discount_pelliculage", value: 0.0, unit: "ratio", description: "Lamination discount (XLSM: 0% off)" },
  ];

  for (const cfg of offsetConfigData) {
    const row = await prisma.offsetConfig.findFirst({ where: { fournisseurId: null, key: cfg.key } });
    if (row) {
      await prisma.offsetConfig.update({ where: { id: row.id }, data: { value: cfg.value, unit: cfg.unit ?? undefined, description: cfg.description ?? undefined } });
    } else {
      await prisma.offsetConfig.create({ data: { ...cfg } });
    }
  }
  console.log(`⚙️  ${offsetConfigData.length} offset config entries (default upserted)`);

  // ── 14. Digital Config (XLSM-aligned) ─────────────────────────────────────
  const digitalConfigData = [
    { key: "color_click_rate", value: 0.03, unit: "EUR", description: "Cost per color click (XLSM)" },
    { key: "mono_click_rate", value: 0.0065, unit: "EUR", description: "Cost per mono click (XLSM)" },
    { key: "setup_color", value: 0, unit: "EUR", description: "XLSM: no digital setup" },
    { key: "setup_mono", value: 0, unit: "EUR", description: "XLSM: no digital setup" },
    { key: "file_processing", value: 45.0, unit: "EUR", description: "Flat fee brochures" },
    { key: "file_processing_flat", value: 10.0, unit: "EUR", description: "Flat fee depliants/flyers" },
    { key: "setup_divisor", value: 3000, unit: "divisor", description: "Legacy setup divisor" },
    { key: "digital_markup_multiplier", value: 1.5, unit: "ratio", description: "(Paper + Clics) × 1.50 (XLSM)" },
    { key: "minimum_billing_flat", value: 25.0, unit: "EUR", description: "Minimum billing flat products" },
    { key: "cutting_cost_per_pose", value: 0.85, unit: "EUR", description: "Cutting cost per pose" },
    { key: "cutting_cost_per_model", value: 1.25, unit: "EUR", description: "Cutting cost per model" },
    { key: "brochure_digital_margin", value: 0.10, unit: "ratio", description: "Brochure digital margin rate (10%, XLSM §4.4)" },
  ];

  for (const cfg of digitalConfigData) {
    const row = await prisma.digitalConfig.findFirst({ where: { fournisseurId: null, key: cfg.key } });
    if (row) {
      await prisma.digitalConfig.update({ where: { id: row.id }, data: { value: cfg.value, unit: cfg.unit ?? undefined, description: cfg.description ?? undefined } });
    } else {
      await prisma.digitalConfig.create({ data: { ...cfg } });
    }
  }
  console.log(`⚙️  ${digitalConfigData.length} digital config entries (default upserted)`);

  // ── 15. Margin Config ────────────────────────────────────────────────────
  const marginConfigData = [
    { key: "digital_markup", value: 1.05, unit: "multiplier", description: "Global markup for digital products default (Excel: * 1.05)" },
    { key: "offset_markup", value: 1.07, unit: "multiplier", description: "Global markup for offset products default (Excel: * 1.07)" },
    { key: "paper_margin", value: 0.10, unit: "ratio", description: "10% markup on paper costs (XLSM: 0.10)" },
  ];

  for (const cfg of marginConfigData) {
    const row = await prisma.marginConfig.findFirst({ where: { fournisseurId: null, key: cfg.key } });
    if (row) {
      await prisma.marginConfig.update({ where: { id: row.id }, data: { value: cfg.value, unit: cfg.unit ?? undefined, description: cfg.description ?? undefined } });
    } else {
      await prisma.marginConfig.create({ data: { ...cfg } });
    }
  }
  console.log(`💰 ${marginConfigData.length} margin config entries (default upserted)`);

  // ── 16. Machine Formats ──────────────────────────────────────────────────
  const machineFormatsData = [
    { name: "32x45", widthCm: 32, heightCm: 45, isDefault: false, defaultWasteRatio: 0.02, wasteTiers: [{ max: 3000, ratio: 0.05 }], runningCostTiers: [{ max: 1000, cost: 25 }, { max: 3000, cost: 15 }] },
    { name: "45x64", widthCm: 45, heightCm: 64, isDefault: false, defaultWasteRatio: 0.02, wasteTiers: [{ max: 3000, ratio: 0.05 }], runningCostTiers: [{ max: 1000, cost: 25 }, { max: 3000, cost: 15 }] },
    { name: "64x90", widthCm: 64, heightCm: 90, isDefault: false, defaultWasteRatio: 0.02, wasteTiers: [{ max: 3000, ratio: 0.05 }], runningCostTiers: [{ max: 1000, cost: 25 }, { max: 3000, cost: 15 }] },
    { name: "65x92", widthCm: 65, heightCm: 92, isDefault: true, defaultWasteRatio: 0.02, wasteTiers: [{ max: 3000, ratio: 0.002 }], runningCostTiers: [{ max: 1000, cost: 25 }, { max: 3000, cost: 15 }] }, // Komori
    { name: "70x102", widthCm: 70, heightCm: 102, isDefault: false, defaultWasteRatio: 0.02, wasteTiers: [{ max: 3000, ratio: 0.002 }], runningCostTiers: [{ max: 1000, cost: 15 }, { max: 3000, cost: 15 }] },
    { name: "72x102", widthCm: 72, heightCm: 102, isDefault: false, defaultWasteRatio: 0.02, wasteTiers: [{ max: 3000, ratio: 0.05 }], runningCostTiers: [{ max: 1000, cost: 25 }, { max: 3000, cost: 15 }] }, // Roland
  ];

  for (const mf of machineFormatsData) {
    const row = await prisma.machineFormat.findFirst({ where: { fournisseurId: null, name: mf.name } });
    if (!row) await prisma.machineFormat.create({ data: { ...mf } });
  }
  console.log(`🖨️  ${machineFormatsData.length} machine formats created`);

  // ── 17. Format Click Divisors ────────────────────────────────────────────
  const formatClickDivisorsData = [
    { formatName: "A4 Francaise", divisorRecto: 1, divisorRectoVerso: 2 },
    { formatName: "A4 Paysage", divisorRecto: 1, divisorRectoVerso: 2 },
    { formatName: "A5 Francaise", divisorRecto: 2, divisorRectoVerso: 4 },
    { formatName: "A5 Paysage", divisorRecto: 2, divisorRectoVerso: 4 },
    { formatName: "A6 Francaise", divisorRecto: 4, divisorRectoVerso: 8 },
  ];

  for (const fcd of formatClickDivisorsData) {
    const row = await prisma.formatClickDivisor.findFirst({ where: { fournisseurId: null, formatName: fcd.formatName } });
    if (!row) await prisma.formatClickDivisor.create({ data: { ...fcd } });
  }
  console.log(`🧮 ${formatClickDivisorsData.length} format click divisors created`);

  // ── 18. Digital Cut Tiers (Numérique Coupe) ──────────────────────────────
  const digitalCutTiersData = [
    { productType: "BROCHURE" as const, qtyMax: 100, perUnitCost: 0.07, setupCost: 10.0 },
    { productType: "BROCHURE" as const, qtyMax: 200, perUnitCost: 0.06, setupCost: 10.0 },
    { productType: "BROCHURE" as const, qtyMax: 300, perUnitCost: 0.05, setupCost: 10.0 },
    { productType: "BROCHURE" as const, qtyMax: 400, perUnitCost: 0.04, setupCost: 10.0 },
    { productType: "BROCHURE" as const, qtyMax: 50000, perUnitCost: 0.03, setupCost: 10.0 },
    { productType: "FLYER" as const, qtyMax: 500, perUnitCost: 0.0008, setupCost: 10.0 },
    { productType: "FLYER" as const, qtyMax: 1000, perUnitCost: 0.0007, setupCost: 10.0 },
    { productType: "FLYER" as const, qtyMax: 2500, perUnitCost: 0.0005, setupCost: 10.0 },
    { productType: "FLYER" as const, qtyMax: 50000, perUnitCost: 0.0004, setupCost: 10.0 },
  ];

  await prisma.digitalCutTier.deleteMany();
  for (const dct of digitalCutTiersData) {
    await prisma.digitalCutTier.create({ data: dct });
  }
  console.log(`✂️  ${digitalCutTiersData.length} digital cut tiers created`);
  const formatClickDivisorsData2 = [
    { formatName: "5.5x8.5", divisorRecto: 25, divisorRectoVerso: 12.5 },
    { formatName: "10x15", divisorRecto: 8, divisorRectoVerso: 4 },
    { formatName: "10x21", divisorRecto: 6, divisorRectoVerso: 3 },
    { formatName: "14.8x21", divisorRecto: 4, divisorRectoVerso: 2 },
    { formatName: "16x24", divisorRecto: 4, divisorRectoVerso: 1 },
    { formatName: "21x29.7", divisorRecto: 2, divisorRectoVerso: 1 },
    { formatName: "29.7x42", divisorRecto: 1, divisorRectoVerso: 0.5 },
  ];

  for (const fcd of formatClickDivisorsData2) {
    const row = await prisma.formatClickDivisor.findFirst({ where: { fournisseurId: null, formatName: fcd.formatName } });
    if (!row) await prisma.formatClickDivisor.create({ data: { ...fcd } });
  }
  console.log(`🔢 ${formatClickDivisorsData2.length} format click divisors created`);

  // ── 18. Copy default config to Fournisseur (demo placeholder) ─────────────
  const fid = admin.id;
  const copyScalar = (v: unknown): number =>
    typeof v === "object" && v !== null && "toNumber" in v ? (v as { toNumber: () => number }).toNumber() : Number(v);

  const defaultPaperTypes = await prisma.paperType.findMany({ where: { fournisseurId: null }, include: { grammages: true } });
  const paperTypeIdMap: Record<string, string> = {};
  for (const pt of defaultPaperTypes) {
    const created = await prisma.paperType.create({
      data: { fournisseurId: fid, name: pt.name, category: pt.category, active: pt.active, sortOrder: pt.sortOrder },
    });
    paperTypeIdMap[pt.id] = created.id;
    for (const g of pt.grammages) {
      await prisma.paperGrammage.create({
        data: {
          paperTypeId: created.id,
          grammage: g.grammage,
          pricePerKg: copyScalar(g.pricePerKg) ?? g.pricePerKg,
          weightPer1000Sheets: g.weightPer1000Sheets != null ? copyScalar(g.weightPer1000Sheets) : null,
          availableForDosCarre: g.availableForDosCarre,
        },
      });
    }
  }

  const defaultFormatPresets = await prisma.formatPreset.findMany({ where: { fournisseurId: null } });
  for (const fp of defaultFormatPresets) {
    await prisma.formatPreset.create({
      data: {
        fournisseurId: fid,
        name: fp.name,
        widthCm: copyScalar(fp.widthCm),
        heightCm: copyScalar(fp.heightCm),
        orientation: fp.orientation,
        productTypes: fp.productTypes as object,
        active: fp.active,
      },
    });
  }

  const defaultColorModes = await prisma.colorMode.findMany({ where: { fournisseurId: null } });
  for (const cm of defaultColorModes) {
    await prisma.colorMode.create({
      data: {
        fournisseurId: fid,
        name: cm.name,
        platesPerSide: cm.platesPerSide,
        hasVarnish: cm.hasVarnish,
        clickMultiplier: copyScalar(cm.clickMultiplier),
        active: cm.active,
      },
    });
  }

  const defaultBindingTypes = await prisma.bindingType.findMany({
    where: { fournisseurId: null },
    include: { digitalPriceTiers: true, offsetPriceTiers: true },
  });
  const bindingTypeIdMap: Record<string, string> = {};
  for (const bt of defaultBindingTypes) {
    const created = await prisma.bindingType.create({
      data: { fournisseurId: fid, name: bt.name, minPages: bt.minPages, maxPages: bt.maxPages, active: bt.active },
    });
    bindingTypeIdMap[bt.id] = created.id;
    for (const t of bt.digitalPriceTiers) {
      await prisma.bindingPriceTierDigital.create({
        data: {
          bindingTypeId: created.id,
          pageRangeMin: t.pageRangeMin,
          pageRangeMax: t.pageRangeMax,
          qtyMin: t.qtyMin,
          qtyMax: t.qtyMax,
          perUnitCost: copyScalar(t.perUnitCost),
          setupCost: copyScalar(t.setupCost),
        },
      });
    }
    for (const t of bt.offsetPriceTiers) {
      await prisma.bindingPriceTierOffset.create({
        data: {
          bindingTypeId: created.id,
          cahiersCount: t.cahiersCount,
          calageCost: copyScalar(t.calageCost),
          roulagePer1000: copyScalar(t.roulagePer1000),
        },
      });
    }
  }

  const defaultFoldTypes = await prisma.foldType.findMany({ where: { fournisseurId: null }, include: { costs: true } });
  const foldTypeIdMap: Record<string, string> = {};
  for (const ft of defaultFoldTypes) {
    const created = await prisma.foldType.create({
      data: { fournisseurId: fid, name: ft.name, maxFolds: ft.maxFolds, canBeSecondary: ft.canBeSecondary, active: ft.active },
    });
    foldTypeIdMap[ft.id] = created.id;
    for (const fc of ft.costs) {
      await prisma.foldCost.create({
        data: { foldTypeId: created.id, numFolds: fc.numFolds, cost: copyScalar(fc.cost) },
      });
    }
  }

  const defaultLaminationModes = await prisma.laminationMode.findMany({ where: { fournisseurId: null } });
  for (const lm of defaultLaminationModes) {
    await prisma.laminationMode.create({ data: { fournisseurId: fid, name: lm.name } });
  }

  const defaultLaminationFinishes = await prisma.laminationFinish.findMany({
    where: { fournisseurId: null },
    include: { digitalPriceTiers: true },
  });
  for (const lf of defaultLaminationFinishes) {
    const created = await prisma.laminationFinish.create({
      data: {
        fournisseurId: fid,
        name: lf.name,
        offsetPricePerM2: lf.offsetPricePerM2 != null ? copyScalar(lf.offsetPricePerM2) : null,
        offsetCalageForfait: lf.offsetCalageForfait != null ? copyScalar(lf.offsetCalageForfait) : null,
        offsetMinimumBilling: lf.offsetMinimumBilling != null ? copyScalar(lf.offsetMinimumBilling) : null,
        active: lf.active,
      },
    });
    for (const t of lf.digitalPriceTiers) {
      await prisma.laminationPriceTier.create({
        data: {
          finishId: created.id,
          qtyMin: t.qtyMin,
          qtyMax: t.qtyMax,
          pricePerSheet: copyScalar(t.pricePerSheet),
          setupCost: copyScalar(t.setupCost),
        },
      });
    }
  }

  const defaultPackaging = await prisma.packagingOption.findMany({ where: { fournisseurId: null } });
  for (const pkg of defaultPackaging) {
    await prisma.packagingOption.create({
      data: {
        fournisseurId: fid,
        name: pkg.name,
        type: pkg.type,
        costPerUnit: copyScalar(pkg.costPerUnit),
        costPerOrder: copyScalar(pkg.costPerOrder),
        appliesTo: pkg.appliesTo as object,
        active: pkg.active,
      },
    });
  }

  const defaultCarriers = await prisma.carrier.findMany({ where: { fournisseurId: null }, include: { deliveryRates: true } });
  for (const c of defaultCarriers) {
    const created = await prisma.carrier.create({ data: { fournisseurId: fid, name: c.name, active: c.active } });
    for (const r of c.deliveryRates) {
      await prisma.deliveryRate.create({
        data: {
          carrierId: created.id,
          zone: r.zone,
          maxWeightKg: copyScalar(r.maxWeightKg),
          price: copyScalar(r.price),
        },
      });
    }
  }

  const defaultOffsetConfig = await prisma.offsetConfig.findMany({ where: { fournisseurId: null } });
  for (const c of defaultOffsetConfig) {
    await prisma.offsetConfig.create({
      data: { fournisseurId: fid, key: c.key, value: copyScalar(c.value), unit: c.unit ?? undefined, description: c.description ?? undefined },
    });
  }
  const defaultDigitalConfig = await prisma.digitalConfig.findMany({ where: { fournisseurId: null } });
  for (const c of defaultDigitalConfig) {
    await prisma.digitalConfig.create({
      data: { fournisseurId: fid, key: c.key, value: copyScalar(c.value), unit: c.unit ?? undefined, description: c.description ?? undefined },
    });
  }
  const defaultMarginConfig = await prisma.marginConfig.findMany({ where: { fournisseurId: null } });
  for (const c of defaultMarginConfig) {
    await prisma.marginConfig.create({
      data: { fournisseurId: fid, key: c.key, value: copyScalar(c.value), unit: c.unit ?? undefined, description: c.description ?? undefined },
    });
  }

  const defaultMachineFormats = await prisma.machineFormat.findMany({ where: { fournisseurId: null } });
  for (const mf of defaultMachineFormats) {
    await prisma.machineFormat.create({
      data: { fournisseurId: fid, name: mf.name, widthCm: mf.widthCm, heightCm: mf.heightCm, isDefault: mf.isDefault },
    });
  }

  const defaultFormatClickDivisors = await prisma.formatClickDivisor.findMany({ where: { fournisseurId: null } });
  for (const fcd of defaultFormatClickDivisors) {
    await prisma.formatClickDivisor.create({
      data: {
        fournisseurId: fid,
        formatName: fcd.formatName,
        divisorRecto: fcd.divisorRecto,
        divisorRectoVerso: fcd.divisorRectoVerso,
      },
    });
  }

  console.log(`📋 Default config copied to Fournisseur (${admin.email}) as demo placeholder`);

  console.log("\n🎉 Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
