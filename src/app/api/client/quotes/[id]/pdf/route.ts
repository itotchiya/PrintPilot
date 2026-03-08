import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateQuotePDF } from '@/lib/pdf/quote-pdf';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(
  request: NextRequest,
  context: RouteParams
) {
  try {
    const session = await getServerSession(authOptions);
    const { searchParams } = new URL(request.url);
    const supplierId = searchParams.get('supplier');
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

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Supplier ID required' },
        { status: 400 }
      );
    }

    // Get supplier details
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Get the specific supplier's quote result
    const multiResults = quote.multiSupplierResults as Record<string, {
      totalPrice: number;
      unitPrice: number;
      breakdown: Array<{ label: string; amount: number }>;
      turnaround: string;
    }>;
    
    const quoteResult = multiResults[supplierId];

    if (!quoteResult) {
      return NextResponse.json(
        { error: 'Quote result not found for this supplier' },
        { status: 404 }
      );
    }

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

    // Generate PDF
    const pdfBuffer = await generateQuotePDF({
      supplier,
      quote: {
        id: quote.id,
        productType: quote.productType,
        specifications,
        createdAt: quote.createdAt,
      },
      quoteResult,
      clientName: session.user.name || 'Client',
    });

    // Log PDF download - use clientId and type fields
    await prisma.activityLog.create({
      data: {
        clientId: session.user.id,
        type: 'PDF_DOWNLOADED',
        quoteId: quote.id,
        metadata: {
          supplierId,
          supplierName: supplier.companyName,
        },
      },
    });

    // Notify supplier (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_APP_URL || ''}/api/webhooks/notify-pdf-download`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        supplierId,
        clientId: session.user.id,
        clientName: session.user.name,
        quoteId: quote.id,
      }),
    }).catch(() => {
      // Silent fail for notifications
    });

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${supplier.companyName}-quote-${quote.id.slice(0, 8)}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Failed to generate PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate PDF' },
      { status: 500 }
    );
  }
}
