import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { calculateQuoteForSupplier } from '@/lib/pricing/multi-supplier';
import { generateQuoteNumber } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { selectedSuppliers, productType, quantity, format, pages, colorMode, binding, lamination } = body;

    if (!selectedSuppliers || selectedSuppliers.length === 0) {
      return NextResponse.json(
        { error: 'Please select at least one supplier' },
        { status: 400 }
      );
    }

    // Verify the client has access to all selected suppliers
    const accessCheck = await prisma.supplierClientAccess.findMany({
      where: {
        clientId: session.user.id,
        supplierId: { in: selectedSuppliers },
      },
    });

    const accessibleSupplierIds = accessCheck.map(a => a.supplierId);
    const inaccessibleSuppliers = selectedSuppliers.filter(
      (id: string) => !accessibleSupplierIds.includes(id)
    );

    if (inaccessibleSuppliers.length > 0) {
      return NextResponse.json(
        { error: 'Access denied to some suppliers' },
        { status: 403 }
      );
    }

    // Calculate prices for each supplier
    const multiSupplierResults: Record<string, {
      totalPrice: number;
      unitPrice: number;
      breakdown: Array<{ label: string; amount: number }>;
      turnaround: string;
    }> = {};

    const quoteSpecs = {
      productType,
      quantity,
      format,
      pages,
      colorMode,
      binding,
      lamination,
    };

    for (const supplierId of selectedSuppliers) {
      const result = await calculateQuoteForSupplier(supplierId, quoteSpecs);
      multiSupplierResults[supplierId] = result;
    }

    // Generate quote number
    const quoteNumber = generateQuoteNumber();

    // Create the quote using actual Quote model fields
    const quote = await prisma.quote.create({
      data: {
        quoteNumber,
        userId: session.user.id,
        productType: productType.toUpperCase(),
        quantity,
        formatName: format,
        formatWidth: 21,
        formatHeight: 29.7,
        pagesInterior: pages,
        colorModeInterior: colorMode,
        bindingType: binding,
        laminationMode: lamination,
        multiSupplierResults,
        status: 'DRAFT',
      },
    });

    // Log the activity
    await prisma.activityLog.create({
      data: {
        clientId: session.user.id,
        type: 'QUOTE_CREATED',
        quoteId: quote.id,
        metadata: {
          supplierCount: selectedSuppliers.length,
          suppliers: selectedSuppliers,
          productType,
        },
      },
    });

    return NextResponse.json({ 
      quoteId: quote.id,
      results: multiSupplierResults,
    });
  } catch (error) {
    console.error('Failed to create quote:', error);
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const quotes = await prisma.quote.findMany({
      where: { 
        userId: session.user.id,
        multiSupplierResults: { not: undefined },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json({ quotes });
  } catch (error) {
    console.error('Failed to fetch quotes:', error);
    return NextResponse.json(
      { error: 'Failed to fetch quotes' },
      { status: 500 }
    );
  }
}
