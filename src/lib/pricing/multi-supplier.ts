import { prisma } from '@/lib/prisma';

interface QuoteSpecifications {
  productType: string;
  quantity: number;
  format: string;
  pages: number;
  colorMode: string;
  binding?: string;
  lamination?: string;
}

interface QuoteResult {
  totalPrice: number;
  unitPrice: number;
  breakdown: Array<{ label: string; amount: number }>;
  turnaround: string;
}

export async function calculateQuoteForSupplier(
  supplierId: string,
  specs: QuoteSpecifications
): Promise<QuoteResult> {
  // Get supplier pricing configuration - query individual config tables
  const [paperTypes, bindingTypes, laminationModes] = await Promise.all([
    prisma.paperType.findMany({
      where: { supplierId },
      include: { grammages: true },
    }),
    prisma.bindingType.findMany({
      where: { supplierId },
      include: { digitalPriceTiers: true },
    }),
    prisma.laminationMode.findMany({
      where: { supplierId },
    }),
  ]);

  // Get supplier profile for branding info
  const supplier = await prisma.supplierProfile.findUnique({
    where: { id: supplierId },
  });

  if (!supplier) {
    throw new Error('Supplier not found');
  }

  const breakdown: Array<{ label: string; amount: number }> = [];
  let basePrice = 0;

  // Get paper cost per page (use first available paper type or default)
  const defaultPaper = paperTypes.find(pt => pt.active) || paperTypes[0];
  const defaultGrammage = defaultPaper?.grammages[0];
  // Calculate cost: pricePerKg * weightPer1000Sheets / 1000 * pages
  const paperCostPerPage = defaultGrammage?.pricePerKg && defaultGrammage?.weightPer1000Sheets
    ? Number(defaultGrammage.pricePerKg) * Number(defaultGrammage.weightPer1000Sheets) / 1000
    : 0.05;
  const paperCost = paperCostPerPage * specs.pages * specs.quantity;
  breakdown.push({ label: 'Paper', amount: paperCost });
  basePrice += paperCost;

  // Color mode multiplier based on selection
  let colorMultiplier = 1.0;
  if (specs.colorMode?.includes('4')) {
    colorMultiplier = 1.5; // Full color
  } else if (specs.colorMode?.includes('1')) {
    colorMultiplier = 1.0; // Black & white
  }
  
  if (colorMultiplier > 1.0) {
    const colorCost = basePrice * (colorMultiplier - 1);
    breakdown.push({ label: 'Color Printing', amount: colorCost });
    basePrice += colorCost;
  }

  // Volume discount based on quantity
  let volumeDiscount = 0;
  if (specs.quantity >= 1000) {
    volumeDiscount = 0.15; // 15% discount
  } else if (specs.quantity >= 500) {
    volumeDiscount = 0.10; // 10% discount
  } else if (specs.quantity >= 250) {
    volumeDiscount = 0.05; // 5% discount
  }
  
  if (volumeDiscount > 0) {
    const discountAmount = basePrice * volumeDiscount;
    breakdown.push({ label: 'Volume Discount', amount: -discountAmount });
    basePrice -= discountAmount;
  }

  // Add binding costs
  if (specs.binding && specs.binding !== 'None') {
    const bindingType = bindingTypes.find(
      bt => bt.name.toLowerCase() === specs.binding?.toLowerCase()
    );
    // Get price from first tier or use default
    const perUnitCost = bindingType?.digitalPriceTiers[0]?.perUnitCost;
    const bindingCost = perUnitCost 
      ? Number(perUnitCost) * specs.quantity
      : 0.5 * specs.quantity;
    if (bindingCost > 0) {
      breakdown.push({ label: `Binding (${specs.binding})`, amount: bindingCost });
      basePrice += bindingCost;
    }
  }

  // Add lamination costs - check LaminationFinish model
  if (specs.lamination && specs.lamination !== 'None') {
    // Default lamination cost per page
    const laminationCost = 0.3 * specs.pages * specs.quantity;
    breakdown.push({ label: `Lamination (${specs.lamination})`, amount: laminationCost });
    basePrice += laminationCost;
  }

  // Calculate turnaround based on quantity
  let turnaround = '2-3 business days';
  if (specs.quantity > 1000) {
    turnaround = '5-7 business days';
  } else if (specs.quantity > 500) {
    turnaround = '3-5 business days';
  }

  const totalPrice = Math.round(basePrice * 100) / 100;
  const unitPrice = Math.round((totalPrice / specs.quantity) * 100) / 100;

  return {
    totalPrice,
    unitPrice,
    breakdown,
    turnaround,
  };
}

export async function getSuppliersWithPricing(
  supplierIds: string[],
  specs: QuoteSpecifications
): Promise<Array<{
  supplierId: string;
  companyName: string;
  logoUrl?: string;
  primaryColor?: string;
  quote: QuoteResult;
}>> {
  const results = await Promise.all(
    supplierIds.map(async (id) => {
      const supplier = await prisma.supplierProfile.findUnique({
        where: { id },
        select: {
          id: true,
          companyName: true,
          logoUrl: true,
          primaryColor: true,
        },
      });

      if (!supplier) return null;

      const quote = await calculateQuoteForSupplier(id, specs);

      return {
        supplierId: supplier.id,
        companyName: supplier.companyName,
        logoUrl: supplier.logoUrl || undefined,
        primaryColor: supplier.primaryColor || undefined,
        quote,
      };
    })
  );

  return results.filter((r): r is NonNullable<typeof r> => r !== null);
}
