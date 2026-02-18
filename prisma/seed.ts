import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";
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
  await prisma.quote.deleteMany();
  await prisma.user.deleteMany();

  console.log("✅ Database cleaned");

  // ── 1. Admin User ────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@printpilot.fr" },
    update: {},
    create: {
      name: "Admin PrintPilot",
      email: "admin@printpilot.fr",
      passwordHash,
      role: "ADMIN",
    },
  });
  console.log(`👤 Admin user created: ${admin.email}`);

  // ── 2. Paper Types ───────────────────────────────────────────────────────
  const paperTypesData = [
    { name: "Couche Satin", category: "BOTH" as const, sortOrder: 1 },
    { name: "Couche Mat", category: "BOTH" as const, sortOrder: 2 },
    { name: "Brillant", category: "BOTH" as const, sortOrder: 3 },
    { name: "Offset", category: "BOTH" as const, sortOrder: 4 },
    { name: "Recycle", category: "BOTH" as const, sortOrder: 5 },
    { name: "Bouffant Munken Blanc", category: "INTERIOR" as const, sortOrder: 6 },
    { name: "Bouffant Munken Creme", category: "INTERIOR" as const, sortOrder: 7 },
    { name: "Bouffant Blanc", category: "INTERIOR" as const, sortOrder: 8 },
    { name: "Carte 1 face", category: "COVER" as const, sortOrder: 9 },
  ];

  const paperTypes: Record<string, { id: string }> = {};
  for (const pt of paperTypesData) {
    paperTypes[pt.name] = await prisma.paperType.upsert({
      where: { name: pt.name },
      update: {},
      create: pt,
    });
  }
  console.log(`📄 ${Object.keys(paperTypes).length} paper types created`);

  // ── 3. Paper Grammages ───────────────────────────────────────────────────
  type GrammageEntry = { grammage: number; pricePerKg: number };

  const standardGrammages: GrammageEntry[] = [80, 90, 100, 115, 130, 135, 150, 170, 200, 250, 300, 350, 400].map(
    (g) => ({ grammage: g, pricePerKg: 1.0 })
  );

  const grammagesByPaper: Record<string, GrammageEntry[]> = {
    "Couche Satin": standardGrammages,
    "Couche Mat": standardGrammages,
    Brillant: standardGrammages,
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
    await prisma.formatPreset.upsert({
      where: { name: fp.name },
      update: {},
      create: fp,
    });
  }
  console.log(`📐 ${formatPresetsData.length} format presets created`);

  // ── 5. Color Modes ───────────────────────────────────────────────────────
  const colorModesData = [
    { name: "Quadrichromie", platesPerSide: 4, hasVarnish: false, clickMultiplier: 1.0 },
    { name: "Quadrichromie + Vernis Machine", platesPerSide: 4, hasVarnish: true, clickMultiplier: 1.0 },
    { name: "Bichromie", platesPerSide: 2, hasVarnish: false, clickMultiplier: 0.5 },
    { name: "Noir", platesPerSide: 1, hasVarnish: false, clickMultiplier: 0.25 },
  ];

  for (const cm of colorModesData) {
    await prisma.colorMode.upsert({
      where: { name: cm.name },
      update: {},
      create: cm,
    });
  }
  console.log(`🎨 ${colorModesData.length} color modes created`);

  // ── 6. Binding Types + Digital Price Tiers ───────────────────────────────
  const bindingTypesData = [
    { name: "Piqure", minPages: 4, maxPages: 96 },
    { name: "Dos carre colle", minPages: 40, maxPages: null },
    { name: "Dos carre colle PUR", minPages: 40, maxPages: null },
    { name: "Dos carre colle avec couture", minPages: 40, maxPages: null },
  ];

  const bindingTypes: Record<string, { id: string }> = {};
  for (const bt of bindingTypesData) {
    bindingTypes[bt.name] = await prisma.bindingType.upsert({
      where: { name: bt.name },
      update: {},
      create: bt,
    });
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
    `📎 ${dosCarreColleTiers.length + dosCarreCollePURTiers.length} binding digital price tiers created`
  );

  // ── 7. Fold Types + Costs ────────────────────────────────────────────────
  const foldTypesData = [
    { name: "Pli Roule", maxFolds: 6, canBeSecondary: false },
    { name: "Pli Accordeon", maxFolds: 6, canBeSecondary: false },
    { name: "Pli Croise", maxFolds: 6, canBeSecondary: true },
  ];

  const foldCostsData = [
    { numFolds: 1, cost: 22.5 },
    { numFolds: 2, cost: 22.5 },
    { numFolds: 3, cost: 45.0 },
    { numFolds: 4, cost: 54.0 },
    { numFolds: 5, cost: 64.8 },
    { numFolds: 6, cost: 77.76 },
  ];

  let foldCostCount = 0;
  for (const ft of foldTypesData) {
    const foldType = await prisma.foldType.upsert({
      where: { name: ft.name },
      update: {},
      create: ft,
    });

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
    await prisma.laminationMode.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }
  console.log(`✨ ${laminationModes.length} lamination modes created`);

  // ── 9. Lamination Finishes + Digital Tiers ───────────────────────────────
  const laminationFinishesData = [
    { name: "Brillant", offsetPricePerM2: 0.25, offsetCalageForfait: 55.0, offsetMinimumBilling: 60.0 },
    { name: "Mat", offsetPricePerM2: 0.3, offsetCalageForfait: 55.0, offsetMinimumBilling: 115.0 },
    { name: "Soft Touch", offsetPricePerM2: 0.5, offsetCalageForfait: 55.0, offsetMinimumBilling: 115.0 },
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
    const finish = await prisma.laminationFinish.upsert({
      where: { name: lf.name },
      update: {},
      create: lf,
    });

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
  const packagingData = [
    { name: "Mise en cartons", type: "CARTON", costPerUnit: 0, costPerOrder: 0, appliesTo: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
    { name: "Mise sous film", type: "FILM", costPerUnit: 0, costPerOrder: 0, appliesTo: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
    { name: "Mise sous elastiques par paquet", type: "ELASTIQUE", costPerUnit: 0, costPerOrder: 0, appliesTo: ["BROCHURE", "DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
    { name: "Boite cristal", type: "CRYSTAL_BOX", costPerUnit: 0, costPerOrder: 0, appliesTo: ["DEPLIANT", "FLYER", "CARTE_DE_VISITE"] },
  ];

  for (const pkg of packagingData) {
    await prisma.packagingOption.upsert({
      where: { name: pkg.name },
      update: {},
      create: pkg,
    });
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
  const franceExpress = await prisma.carrier.upsert({
    where: { name: "France EXPRESS" },
    update: {},
    create: { name: "France EXPRESS", active: true },
  });
  const tnt = await prisma.carrier.upsert({
    where: { name: "TNT" },
    update: {},
    create: { name: "TNT", active: true },
  });
  console.log(`🚚 2 carriers created (France EXPRESS, TNT)`);

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

  // ── 13. Offset Config ────────────────────────────────────────────────────
  const offsetConfigData = [
    { key: "plate_cost", value: 9.9, unit: "EUR", description: "Cost per aluminum plate" },
    { key: "plate_cost_large", value: 17.4, unit: "EUR", description: "Cost per plate (large format)" },
    { key: "calage_per_plate", value: 6.0, unit: "EUR", description: "Calibration cost per plate" },
    { key: "calage_vernis", value: 6.0, unit: "EUR", description: "Varnish calibration cost" },
    { key: "recherche_teinte", value: 10.0, unit: "EUR", description: "Color matching cost" },
    { key: "file_processing_base", value: 12.5, unit: "EUR", description: "Base file processing fee" },
    { key: "file_processing_per_plate", value: 0.11, unit: "EUR", description: "Additional per plate" },
    { key: "gache_calage", value: 70, unit: "sheets", description: "Waste sheets per plate (calibration)" },
    { key: "gache_recherche_teinte", value: 100, unit: "sheets", description: "Waste sheets for color matching" },
    { key: "gache_tirage_pct", value: 0.02, unit: "ratio", description: "Running waste (2%)" },
    { key: "gache_vernis", value: 2, unit: "sheets", description: "Waste sheets for varnish per plate" },
    { key: "running_cost_tier_1", value: 25.0, unit: "EUR/1000", description: "≤1000 sheets" },
    { key: "running_cost_tier_2", value: 16.0, unit: "EUR/1000", description: "1001-3000 sheets" },
    { key: "running_cost_tier_3", value: 15.0, unit: "EUR/1000", description: "3001-5000 sheets" },
    { key: "running_cost_tier_4", value: 15.0, unit: "EUR/1000", description: "5001-10000 sheets" },
    { key: "running_cost_tier_5", value: 15.0, unit: "EUR/1000", description: ">10000 sheets" },
  ];

  for (const cfg of offsetConfigData) {
    await prisma.offsetConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
  console.log(`⚙️  ${offsetConfigData.length} offset config entries created`);

  // ── 14. Digital Config ───────────────────────────────────────────────────
  const digitalConfigData = [
    { key: "color_click_rate", value: 0.035, unit: "EUR", description: "Cost per color click" },
    { key: "mono_click_rate", value: 0.007, unit: "EUR", description: "Cost per mono click" },
    { key: "setup_color", value: 80.0, unit: "EUR", description: "Color setup cost" },
    { key: "setup_mono", value: 15.0, unit: "EUR", description: "Mono setup cost" },
    { key: "file_processing", value: 45.0, unit: "EUR", description: "Flat fee per job" },
    { key: "setup_divisor", value: 3000, unit: "divisor", description: "Setup cost divisor" },
  ];

  for (const cfg of digitalConfigData) {
    await prisma.digitalConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
  console.log(`⚙️  ${digitalConfigData.length} digital config entries created`);

  // ── 15. Margin Config ────────────────────────────────────────────────────
  const marginConfigData = [
    { key: "digital_final_margin", value: 0.05, unit: "ratio", description: "5% applied to total digital price" },
    { key: "offset_final_margin", value: 0.07, unit: "ratio", description: "7% applied to total offset price" },
    { key: "paper_margin", value: 0.15, unit: "ratio", description: "15% markup on paper costs (offset)" },
  ];

  for (const cfg of marginConfigData) {
    await prisma.marginConfig.upsert({
      where: { key: cfg.key },
      update: {},
      create: cfg,
    });
  }
  console.log(`💰 ${marginConfigData.length} margin config entries created`);

  // ── 16. Machine Formats ──────────────────────────────────────────────────
  const machineFormatsData = [
    { name: "32x45", widthCm: 32, heightCm: 45, isDefault: false },
    { name: "45x64", widthCm: 45, heightCm: 64, isDefault: false },
    { name: "64x90", widthCm: 64, heightCm: 90, isDefault: false },
    { name: "65x92", widthCm: 65, heightCm: 92, isDefault: true },
    { name: "70x102", widthCm: 70, heightCm: 102, isDefault: false },
    { name: "72x102", widthCm: 72, heightCm: 102, isDefault: false },
  ];

  for (const mf of machineFormatsData) {
    await prisma.machineFormat.upsert({
      where: { name: mf.name },
      update: {},
      create: mf,
    });
  }
  console.log(`🖨️  ${machineFormatsData.length} machine formats created`);

  // ── 17. Format Click Divisors ────────────────────────────────────────────
  const formatClickDivisorsData = [
    { formatName: "5.5x8.5", divisorRecto: 25, divisorRectoVerso: 12.5 },
    { formatName: "10x15", divisorRecto: 8, divisorRectoVerso: 4 },
    { formatName: "10x21", divisorRecto: 6, divisorRectoVerso: 3 },
    { formatName: "14.8x21", divisorRecto: 4, divisorRectoVerso: 2 },
    { formatName: "16x24", divisorRecto: 4, divisorRectoVerso: 1 },
    { formatName: "21x29.7", divisorRecto: 2, divisorRectoVerso: 1 },
    { formatName: "29.7x42", divisorRecto: 1, divisorRectoVerso: 0.5 },
  ];

  for (const fcd of formatClickDivisorsData) {
    await prisma.formatClickDivisor.upsert({
      where: { formatName: fcd.formatName },
      update: {},
      create: fcd,
    });
  }
  console.log(`🔢 ${formatClickDivisorsData.length} format click divisors created`);

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
