#!/usr/bin/env tsx
/**
 * Diagnostic Script: Capture Current Configuration State
 * 
 * Run this before and after fixes to verify changes
 */

import { PrismaClient } from "../src/generated/prisma/client";

const prisma = new PrismaClient();

async function diagnose() {
  console.log("=== PRINTPILOT CONFIGURATION DIAGNOSIS ===\n");
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  // 1. Lamination Finishes
  console.log("1. LAMINATION FINISHES");
  console.log("─────────────────────");
  const lamFinishes = await prisma.laminationFinish.findMany({
    where: { fournisseurId: null },
    orderBy: { name: "asc" }
  });
  
  lamFinishes.forEach(lf => {
    console.log(`  Name: ${lf.name}`);
    console.log(`    Price/m²: €${lf.offsetPricePerM2}`);
    console.log(`    Calage: €${lf.offsetCalageForfait}`);
    console.log(`    Minimum: €${lf.offsetMinimumBilling}`);
    
    // Check for issues
    if (lf.name === "Mat" && lf.offsetMinimumBilling !== 60) {
      console.log(`    ⚠️  ISSUE: Mat minimum should be €60, not €${lf.offsetMinimumBilling}`);
    }
    if (lf.name === "Brillant" && lf.offsetMinimumBilling !== 60) {
      console.log(`    ⚠️  ISSUE: Brillant minimum should be €60`);
    }
    console.log("");
  });

  // 2. Offset Config - Critical Values
  console.log("2. OFFSET CONFIG (Critical Values)");
  console.log("───────────────────────────────────");
  const criticalKeys = [
    'running_cost_vernis',
    'plate_cost',
    'plate_cost_large',
    'calage_per_plate',
    'gache_calage',
    'gache_tirage_pct_3k',
    'gache_tirage_pct_5k',
    'gache_tirage_pct_8k',
    'gache_tirage_pct_10k',
    'running_cost_tier_1',
  ];
  
  const offsetConfig = await prisma.offsetConfig.findMany({
    where: { 
      fournisseurId: null,
      key: { in: criticalKeys }
    },
    orderBy: { key: "asc" }
  });
  
  offsetConfig.forEach(c => {
    console.log(`  ${c.key}: ${c.value} ${c.unit || ''}`);
    
    // Check for issues
    if (c.key === 'running_cost_vernis' && c.value !== 20) {
      console.log(`    ⚠️  ISSUE: Should be 20, not ${c.value}`);
    }
  });
  console.log("");

  // 3. Digital Config - Critical Values
  console.log("3. DIGITAL CONFIG (Critical Values)");
  console.log("────────────────────────────────────");
  const digitalKeys = [
    'color_click_rate',
    'mono_click_rate',
    'file_processing',
    'file_processing_flat',
    'digital_markup_multiplier',
  ];
  
  const digitalConfig = await prisma.digitalConfig.findMany({
    where: { 
      fournisseurId: null,
      key: { in: digitalKeys }
    },
    orderBy: { key: "asc" }
  });
  
  digitalConfig.forEach(c => {
    console.log(`  ${c.key}: ${c.value} ${c.unit || ''}`);
  });
  console.log("");

  // 4. Format Click Divisors
  console.log("4. FORMAT CLICK DIVISORS");
  console.log("─────────────────────────");
  const divisors = await prisma.formatClickDivisor.findMany({
    where: { fournisseurId: null },
    orderBy: { formatName: "asc" }
  });
  
  console.log(`  Total divisors: ${divisors.length}`);
  console.log("");
  
  divisors.forEach(d => {
    console.log(`  ${d.formatName}:`);
    console.log(`    Recto: ${d.divisorRecto}`);
    console.log(`    Recto-Verso: ${d.divisorRectoVerso}`);
    
    // Check for potentially inverted values
    if (d.divisorRecto < d.divisorRectoVerso) {
      console.log(`    ⚠️  WARNING: divisorRecto < divisorRectoVerso (may be inverted)`);
    }
  });
  console.log("");

  // 5. Margin Config
  console.log("5. MARGIN CONFIG");
  console.log("─────────────────");
  const marginConfig = await prisma.marginConfig.findMany({
    where: { fournisseurId: null },
    orderBy: { key: "asc" }
  });
  
  marginConfig.forEach(c => {
    console.log(`  ${c.key}: ${c.value} ${c.unit || ''}`);
  });
  console.log("");

  // 6. Summary
  console.log("6. SUMMARY");
  console.log("──────────");
  
  let issues = 0;
  
  // Check Mat lamination
  const matLam = lamFinishes.find(l => l.name === "Mat");
  if (matLam && matLam.offsetMinimumBilling !== 60) {
    console.log(`  ❌ Mat lamination minimum: €${matLam.offsetMinimumBilling} (should be €60)`);
    issues++;
  }
  
  // Check varnish cost
  const vernisConfig = offsetConfig.find(c => c.key === 'running_cost_vernis');
  if (vernisConfig && vernisConfig.value !== 20) {
    console.log(`  ❌ running_cost_vernis: €${vernisConfig.value} (should be €20)`);
    issues++;
  }
  
  // Check for bad divisors
  const badDivisors = divisors.filter(d => 
    ["A4 Francaise", "A4 Paysage", "A5 Francaise", "A5 Paysage", "A6 Francaise"].includes(d.formatName)
  );
  if (badDivisors.length > 0) {
    console.log(`  ❌ Found ${badDivisors.length} potentially inverted divisors`);
    issues++;
  }
  
  if (issues === 0) {
    console.log("  ✅ All critical values are correct!");
  } else {
    console.log(`\n  ⚠️  Found ${issues} issue(s) that need fixing`);
  }

  await prisma.$disconnect();
}

diagnose().catch(e => {
  console.error(e);
  process.exit(1);
});
