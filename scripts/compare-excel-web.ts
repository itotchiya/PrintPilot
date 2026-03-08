#!/usr/bin/env tsx
/**
 * Quote Comparison Script: Excel vs Web App
 * 
 * Generates test quotes and shows expected Excel values
 */

import { calculatePricing } from "../src/lib/pricing/engine";
import { QuoteInput } from "../src/lib/pricing/types";

// Test cases designed to expose the fixed issues
const TEST_CASES: { name: string; input: QuoteInput; expectedExcelOffset?: number }[] = [
  {
    name: "Mat Lamination Test",
    input: {
      productType: "BROCHURE",
      quantity: 500,
      format: { name: "A4", widthCm: 21, heightCm: 29.7 },
      openFormat: null,
      pagesInterior: 48,
      pagesCover: 4,
      flapSizeCm: 0,
      paperInteriorTypeId: "dummy",
      paperInteriorGrammage: 90,
      paperCoverTypeId: "dummy",
      paperCoverGrammage: 250,
      paperInteriorTypeName: "Couche Satin",
      paperCoverTypeName: "Couche Satin",
      colorModeInteriorId: "dummy",
      colorModeCoverId: "dummy",
      colorModeInteriorName: "Quadrichromie",
      colorModeCoverName: "Quadrichromie",
      rectoVerso: true,
      bindingTypeId: "dummy",
      bindingTypeName: "Dos carre colle",
      foldTypeId: null,
      foldTypeName: null,
      foldCount: 0,
      secondaryFoldType: null,
      secondaryFoldCount: 0,
      laminationMode: "Pelliculage Recto",
      laminationFinishId: "dummy",
      laminationFinishName: "Mat",
      packaging: { cartons: false, film: false, elastiques: false, crystalBoxQty: 0 },
      deliveryPoints: [],
      clientName: "Test",
      projectName: "Mat Lamination Test",
      notes: "",
    },
  },
  {
    name: "Varnish Test",
    input: {
      productType: "BROCHURE",
      quantity: 1000,
      format: { name: "A4", widthCm: 21, heightCm: 29.7 },
      openFormat: null,
      pagesInterior: 48,
      pagesCover: 4,
      flapSizeCm: 0,
      paperInteriorTypeId: "dummy",
      paperInteriorGrammage: 90,
      paperCoverTypeId: "dummy",
      paperCoverGrammage: 250,
      paperInteriorTypeName: "Couche Satin",
      paperCoverTypeName: "Couche Satin",
      colorModeInteriorId: "dummy",
      colorModeCoverId: "dummy",
      colorModeInteriorName: "Quadrichromie + Vernis Machine",
      colorModeCoverName: "Quadrichromie",
      rectoVerso: true,
      bindingTypeId: "dummy",
      bindingTypeName: "Dos carre colle",
      foldTypeId: null,
      foldTypeName: null,
      foldCount: 0,
      secondaryFoldType: null,
      secondaryFoldCount: 0,
      laminationMode: "Rien",
      laminationFinishId: null,
      laminationFinishName: null,
      packaging: { cartons: false, film: false, elastiques: false, crystalBoxQty: 0 },
      deliveryPoints: [],
      clientName: "Test",
      projectName: "Varnish Test",
      notes: "",
    },
  },
  {
    name: "Digital A4 Flyer Test",
    input: {
      productType: "FLYER",
      quantity: 1000,
      format: { name: "A4", widthCm: 21, heightCm: 29.7 },
      openFormat: null,
      pagesInterior: 1,
      pagesCover: 0,
      flapSizeCm: 0,
      paperInteriorTypeId: "dummy",
      paperInteriorGrammage: 135,
      paperCoverTypeId: null,
      paperCoverGrammage: null,
      paperInteriorTypeName: "Couche Satin",
      paperCoverTypeName: null,
      colorModeInteriorId: "dummy",
      colorModeCoverId: null,
      colorModeInteriorName: "Quadrichromie",
      colorModeCoverName: null,
      rectoVerso: true,
      bindingTypeId: null,
      bindingTypeName: null,
      foldTypeId: null,
      foldTypeName: null,
      foldCount: 0,
      secondaryFoldType: null,
      secondaryFoldCount: 0,
      laminationMode: "Rien",
      laminationFinishId: null,
      laminationFinishName: null,
      packaging: { cartons: false, film: false, elastiques: false, crystalBoxQty: 0 },
      deliveryPoints: [],
      clientName: "Test",
      projectName: "Digital Flyer Test",
      notes: "",
    },
  },
];

async function compare() {
  console.log("=== EXCEL vs WEB APP COMPARISON ===\n");
  
  for (const testCase of TEST_CASES) {
    console.log(`\nTest: ${testCase.name}`);
    console.log("─".repeat(50));
    
    try {
      const result = await calculatePricing(testCase.input);
      
      console.log(`  Web App Digital:  €${result.digitalTotal.toFixed(2)}`);
      console.log(`  Web App Offset:   €${result.offsetTotal.toFixed(2)}`);
      console.log(`  Best Method:      ${result.bestMethod}`);
      
      if (testCase.expectedExcelOffset) {
        const diff = Math.abs(result.offsetTotal - testCase.expectedExcelOffset);
        const pctDiff = (diff / testCase.expectedExcelOffset) * 100;
        
        console.log(`  Expected (Excel): €${testCase.expectedExcelOffset.toFixed(2)}`);
        console.log(`  Difference:       €${diff.toFixed(2)} (${pctDiff.toFixed(1)}%)`);
        
        if (pctDiff < 2) {
          console.log(`  ✅ ACCEPTABLE`);
        } else if (pctDiff < 5) {
          console.log(`  ⚠️  REVIEW NEEDED`);
        } else {
          console.log(`  ❌ SIGNIFICANT DIFFERENCE`);
        }
      }
      
      // Show breakdown if large difference
      if (result.offsetTotal > 0) {
        console.log(`\n  Offset Breakdown:`);
        console.log(`    Paper:     €${(result.offsetBreakdown as any).paperCostInterior?.toFixed(2) || 'N/A'}`);
        console.log(`    Plates:    €${(result.offsetBreakdown as any).plateCost?.toFixed(2) || 'N/A'}`);
        console.log(`    Calage:    €${(result.offsetBreakdown as any).calageCost?.toFixed(2) || 'N/A'}`);
        console.log(`    Running:   €${(result.offsetBreakdown as any).runningCost?.toFixed(2) || 'N/A'}`);
        console.log(`    Binding:   €${(result.offsetBreakdown as any).bindingCost?.toFixed(2) || 'N/A'}`);
        console.log(`    Lamination:€${(result.offsetBreakdown as any).laminationCost?.toFixed(2) || 'N/A'}`);
      }
      
    } catch (error) {
      console.log(`  ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  console.log("\n" + "=".repeat(50));
  console.log("Comparison complete!");
  console.log("\nNext steps:");
  console.log("1. Run the same test in Excel");
  console.log("2. Compare the results");
  console.log("3. If differences > €10, investigate further");
}

compare().catch(console.error);
