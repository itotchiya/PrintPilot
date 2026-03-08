import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    const { id } = await context.params;
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quote = await prisma.quote.findUnique({
      where: { 
        id,
        userId: session.user.id,
      },
    });

    if (!quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    }

    // Get supplier details for each result
    const supplierIds = Object.keys(quote.multiSupplierResults as Record<string, unknown>);
    
    const suppliers = await prisma.supplierProfile.findMany({
      where: { id: { in: supplierIds } },
      select: {
        id: true,
        companyName: true,
        logoUrl: true,
        primaryColor: true,
      },
    });

    // Map supplier data with their quote results
    const suppliersWithQuotes = supplierIds.map((supplierId) => {
      const supplier = suppliers.find(s => s.id === supplierId);
      const results = quote.multiSupplierResults as Record<string, {
        totalPrice: number;
        unitPrice: number;
        breakdown: Array<{ label: string; amount: number }>;
        turnaround: string;
      }>;
      
      return {
        supplierId,
        companyName: supplier?.companyName || 'Unknown Supplier',
        logoUrl: supplier?.logoUrl,
        primaryColor: supplier?.primaryColor,
        quote: results[supplierId],
      };
    });

    // Build specifications object from quote fields
    const specifications = {
      quantity: quote.quantity,
      format: quote.formatName,
      formatWidth: quote.formatWidth,
      formatHeight: quote.formatHeight,
      pagesInterior: quote.pagesInterior,
      pagesCover: quote.pagesCover,
      paperInterior: quote.paperInteriorType,
      paperCover: quote.paperCoverType,
      colorModeInterior: quote.colorModeInterior,
      colorModeCover: quote.colorModeCover,
      binding: quote.bindingType,
      lamination: quote.laminationMode,
      rectoVerso: quote.rectoVerso,
    };

    return NextResponse.json({ 
      quote: {
        id: quote.id,
        productType: quote.productType,
        specifications,
        multiSupplierResults: quote.multiSupplierResults as Record<string, unknown>,
        createdAt: quote.createdAt,
      },
      suppliers: suppliersWithQuotes,
    });
  } catch (error) {
    console.error('Failed to fetch quote:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quote' },
      { status: 500 }
    );
  }
}
