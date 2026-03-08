#!/usr/bin/env tsx
/**
 * Surgical Fix Script: Apply fixes without full database reset
 * 
 * This script fixes existing data in place without destroying user data
 */

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function fixExistingData() {
  console.log("=== APPLYING SURGICAL FIXES ===\n");
  console.log(`Started: ${new Date().toISOString()}\n`);

  let changes = 0;

  // ─────────────────────────────────────────────────────────────
  // FIX 1: Mat Lamination Minimum Billing
  // ─────────────────────────────────────────────────────────────
  console.log("1. Fixing Mat Lamination Minimum Billing...");
  
  // Fix for default (null fournisseurId)
  const matLaminationDefault = await prisma.laminationFinish.findFirst({
    where: { name: "Mat", fournisseurId: null }
  });
  
  if (matLaminationDefault) {
    if (matLaminationDefault.offsetMinimumBilling !== 60) {
      await prisma.laminationFinish.update({
        where: { id: matLaminationDefault.id },
        data: { offsetMinimumBilling: 60 }
      });
      console.log(`   ✅ Fixed default Mat: €${matLaminationDefault.offsetMinimumBilling} → €60`);
      changes++;
    } else {
      console.log(`   ✅ Default Mat already correct (€60)`);
    }
  } else {
    console.log(`   ⚠️  Default Mat lamination not found`);
  }
  
  // Fix for all suppliers
  const matLaminationsSuppliers = await prisma.laminationFinish.findMany({
    where: { name: "Mat", fournisseurId: { not: null } }
  });
  
  for (const mat of matLaminationsSuppliers) {
    if (mat.offsetMinimumBilling !== 60) {
      await prisma.laminationFinish.update({
        where: { id: mat.id },
        data: { offsetMinimumBilling: 60 }
      });
      console.log(`   ✅ Fixed supplier Mat (${mat.fournisseurId}): €${mat.offsetMinimumBilling} → €60`);
      changes++;
    }
  }
  console.log("");

  // ─────────────────────────────────────────────────────────────
  // FIX 2: Varnish Running Cost
  // ─────────────────────────────────────────────────────────────
  console.log("2. Fixing Varnish Running Cost...");
  
  // Fix default
  const vernisConfigDefault = await prisma.offsetConfig.findFirst({
    where: { key: "running_cost_vernis", fournisseurId: null }
  });
  
  if (vernisConfigDefault) {
    if (vernisConfigDefault.value !== 20) {
      await prisma.offsetConfig.update({
        where: { id: vernisConfigDefault.id },
        data: { value: 20, description: "Varnish running cost per 1000 tours (XLSM: 20)" }
      });
      console.log(`   ✅ Fixed default: €${vernisConfigDefault.value} → €20`);
      changes++;
    } else {
      console.log(`   ✅ Default already correct (€20)`);
    }
  }
  
  // Fix suppliers
  const vernisConfigsSuppliers = await prisma.offsetConfig.findMany({
    where: { key: "running_cost_vernis", fournisseurId: { not: null } }
  });
  
  for (const cfg of vernisConfigsSuppliers) {
    if (cfg.value !== 20) {
      await prisma.offsetConfig.update({
        where: { id: cfg.id },
        data: { value: 20 }
      });
      console.log(`   ✅ Fixed supplier (${cfg.fournisseurId}): €${cfg.value} → €20`);
      changes++;
    }
  }
  console.log("");

  // ─────────────────────────────────────────────────────────────
  // FIX 3: Remove Inverted Click Divisors (Set 1)
  // ─────────────────────────────────────────────────────────────
  console.log("3. Removing Inverted Click Divisors...");
  
  const badFormatNames = [
    "A4 Francaise",
    "A4 Paysage", 
    "A5 Francaise",
    "A5 Paysage",
    "A6 Francaise"
  ];
  
  // Remove default bad divisors
  const badDivisorsDefault = await prisma.formatClickDivisor.findMany({
    where: { 
      formatName: { in: badFormatNames },
      fournisseurId: null 
    }
  });
  
  for (const div of badDivisorsDefault) {
    await prisma.formatClickDivisor.delete({ where: { id: div.id } });
    console.log(`   ✅ Removed bad divisor: ${div.formatName} (recto=${div.divisorRecto}, rv=${div.divisorRectoVerso})`);
    changes++;
  }
  
  // Remove supplier bad divisors
  const badDivisorsSuppliers = await prisma.formatClickDivisor.findMany({
    where: { 
      formatName: { in: badFormatNames },
      fournisseurId: { not: null }
    }
  });
  
  for (const div of badDivisorsSuppliers) {
    await prisma.formatClickDivisor.delete({ where: { id: div.id } });
    console.log(`   ✅ Removed supplier bad divisor: ${div.formatName} (${div.fournisseurId})`);
    changes++;
  }
  console.log("");

  // ─────────────────────────────────────────────────────────────
  // FIX 4: Add Correct Click Divisors (if missing)
  // ─────────────────────────────────────────────────────────────
  console.log("4. Adding Correct Click Divisors...");
  
  const correctDivisors = [
    { formatName: "21x29.7", divisorRecto: 2, divisorRectoVerso: 1 },
    { formatName: "14.8x21", divisorRecto: 4, divisorRectoVerso: 2 },
    { formatName: "10.5x15", divisorRecto: 8, divisorRectoVerso: 4 },
  ];
  
  // Add to default
  for (const div of correctDivisors) {
    const exists = await prisma.formatClickDivisor.findFirst({
      where: { formatName: div.formatName, fournisseurId: null }
    });
    
    if (!exists) {
      await prisma.formatClickDivisor.create({
        data: { ...div, fournisseurId: null }
      });
      console.log(`   ✅ Added default: ${div.formatName} (r=${div.divisorRecto}, rv=${div.divisorRectoVerso})`);
      changes++;
    } else {
      // Update if values are wrong
      if (exists.divisorRecto !== div.divisorRecto || exists.divisorRectoVerso !== div.divisorRectoVerso) {
        await prisma.formatClickDivisor.update({
          where: { id: exists.id },
          data: { divisorRecto: div.divisorRecto, divisorRectoVerso: div.divisorRectoVerso }
        });
        console.log(`   ✅ Updated default: ${div.formatName} (${exists.divisorRecto},${exists.divisorRectoVerso} → ${div.divisorRecto},${div.divisorRectoVerso})`);
        changes++;
      }
    }
  }
  console.log("");

  // ─────────────────────────────────────────────────────────────
  // SUMMARY
  // ─────────────────────────────────────────────────────────────
  console.log("=== FIX SUMMARY ===");
  console.log(`Total changes: ${changes}`);
  console.log(`Completed: ${new Date().toISOString()}`);
  
  if (changes > 0) {
    console.log("\n⚠️  IMPORTANT: Clear application cache to see changes");
    console.log("   Next steps:");
    console.log("   1. Restart application");
    console.log("   2. Run: npx tsx scripts/diagnose-current-state.ts");
    console.log("   3. Test quotes in web app vs Excel");
  } else {
    console.log("\n✅ No changes needed - configuration already correct!");
  }

  await prisma.$disconnect();
}

fixExistingData().catch(e => {
  console.error("❌ Fix failed:", e);
  process.exit(1);
});
