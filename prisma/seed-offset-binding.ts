/**
 * Seeds BindingPriceTierOffset rows from 03-pricing-formulas.md section 2.6
 */
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Offset binding tables keyed by cahiersCount
// cahiersCount = number of cahiers + cover (e.g. 2 means 1 cahier + 1 cover)

const PIQURE_TIERS = [
  { cahiersCount: 2,  calageCost: 73,   roulagePer1000: 31 },
  { cahiersCount: 3,  calageCost: 80,   roulagePer1000: 38 },
  { cahiersCount: 4,  calageCost: 85,   roulagePer1000: 39 },
  { cahiersCount: 5,  calageCost: 90,   roulagePer1000: 43 },
  { cahiersCount: 6,  calageCost: 95,   roulagePer1000: 47 },
  { cahiersCount: 7,  calageCost: 105,  roulagePer1000: 56 },
  { cahiersCount: 8,  calageCost: 115,  roulagePer1000: 65 },
  { cahiersCount: 10, calageCost: 135,  roulagePer1000: 83 },
  { cahiersCount: 12, calageCost: 160,  roulagePer1000: 103 },
  { cahiersCount: 14, calageCost: 185,  roulagePer1000: 123 },
  { cahiersCount: 16, calageCost: 230,  roulagePer1000: 143 },
  { cahiersCount: 18, calageCost: 275,  roulagePer1000: 163 },
];

const DOS_CARRE_TIERS = [
  { cahiersCount: 2,  calageCost: 215.25, roulagePer1000: 91 },
  { cahiersCount: 3,  calageCost: 217.50, roulagePer1000: 96 },
  { cahiersCount: 4,  calageCost: 220.50, roulagePer1000: 106 },
  { cahiersCount: 5,  calageCost: 222.75, roulagePer1000: 121 },
  { cahiersCount: 6,  calageCost: 225.00, roulagePer1000: 131 },
  { cahiersCount: 7,  calageCost: 227.25, roulagePer1000: 141 },
  { cahiersCount: 8,  calageCost: 229.50, roulagePer1000: 156 },
  { cahiersCount: 10, calageCost: 234.00, roulagePer1000: 181 },
  { cahiersCount: 12, calageCost: 238.50, roulagePer1000: 209 },
  { cahiersCount: 14, calageCost: 247.50, roulagePer1000: 234 },
  { cahiersCount: 16, calageCost: 256.50, roulagePer1000: 261 },
  { cahiersCount: 18, calageCost: 267.75, roulagePer1000: 289 },
];

const DOS_CARRE_PUR_TIERS = [
  { cahiersCount: 2,  calageCost: 320.25, roulagePer1000: 95.55 },
  { cahiersCount: 3,  calageCost: 326.25, roulagePer1000: 100.80 },
  { cahiersCount: 4,  calageCost: 338.25, roulagePer1000: 111.30 },
  { cahiersCount: 5,  calageCost: 350.25, roulagePer1000: 127.05 },
  { cahiersCount: 6,  calageCost: 362.25, roulagePer1000: 137.55 },
  { cahiersCount: 7,  calageCost: 374.25, roulagePer1000: 148.05 },
  { cahiersCount: 8,  calageCost: 386.25, roulagePer1000: 163.80 },
  { cahiersCount: 10, calageCost: 410.25, roulagePer1000: 190.05 },
  { cahiersCount: 12, calageCost: 446.25, roulagePer1000: 219.45 },
  { cahiersCount: 14, calageCost: 518.25, roulagePer1000: 245.70 },
  { cahiersCount: 16, calageCost: 590.25, roulagePer1000: 274.05 },
  { cahiersCount: 18, calageCost: 660.45, roulagePer1000: 303.45 },
];

const DOS_CARRE_COUTURE_TIERS = [
  { cahiersCount: 2,  calageCost: 489.28, roulagePer1000: 136.73 },
  { cahiersCount: 3,  calageCost: 497.55, roulagePer1000: 143.93 },
  { cahiersCount: 4,  calageCost: 514.10, roulagePer1000: 158.33 },
  { cahiersCount: 5,  calageCost: 530.65, roulagePer1000: 180.93 },
  { cahiersCount: 6,  calageCost: 547.20, roulagePer1000: 195.33 },
  { cahiersCount: 7,  calageCost: 563.75, roulagePer1000: 209.73 },
  { cahiersCount: 8,  calageCost: 580.30, roulagePer1000: 232.33 },
  { cahiersCount: 10, calageCost: 621.60, roulagePer1000: 269.33 },
  { cahiersCount: 12, calageCost: 671.10, roulagePer1000: 310.43 },
  { cahiersCount: 14, calageCost: 753.60, roulagePer1000: 347.43 },
  { cahiersCount: 16, calageCost: 836.10, roulagePer1000: 387.53 },
  { cahiersCount: 18, calageCost: 859.92, roulagePer1000: 479.12 },
];

async function main() {
  console.log("🗑️  Clearing existing offset binding tiers…");
  await prisma.bindingPriceTierOffset.deleteMany();

  const bindings = await prisma.bindingType.findMany();
  const byName = Object.fromEntries(bindings.map(b => [b.name, b.id]));

  const allTiers: { bindingTypeId: string; cahiersCount: number; calageCost: number; roulagePer1000: number }[] = [];

  for (const t of PIQURE_TIERS) {
    const id = byName["Piqure"];
    if (id) allTiers.push({ bindingTypeId: id, ...t });
  }
  for (const t of DOS_CARRE_TIERS) {
    const id = byName["Dos carre colle"];
    if (id) allTiers.push({ bindingTypeId: id, ...t });
  }
  for (const t of DOS_CARRE_PUR_TIERS) {
    const id = byName["Dos carre colle PUR"];
    if (id) allTiers.push({ bindingTypeId: id, ...t });
  }
  for (const t of DOS_CARRE_COUTURE_TIERS) {
    const id = byName["Dos carre colle avec couture"];
    if (id) allTiers.push({ bindingTypeId: id, ...t });
  }

  for (const tier of allTiers) {
    await prisma.bindingPriceTierOffset.create({ data: tier });
  }

  console.log(`✅ ${allTiers.length} offset binding price tiers seeded`);
  console.log(`   Binding types found: ${Object.keys(byName).join(", ")}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
