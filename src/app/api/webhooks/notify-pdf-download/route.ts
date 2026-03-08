import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPdfDownloadedNotification } from '@/lib/email/resend';

export async function POST(request: NextRequest) {
  try {
    const { supplierId, clientId, clientName, quoteId } = await request.json();

    if (!supplierId || !clientId || !quoteId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Get supplier details
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
      include: { user: { select: { email: true, name: true } } },
    });

    if (!supplier?.user?.email) {
      return NextResponse.json(
        { error: 'Supplier not found or has no email' },
        { status: 404 }
      );
    }

    // Send email notification
    await sendPdfDownloadedNotification({
      to: supplier.user.email,
      supplierName: supplier.companyName,
      clientName: clientName || 'A client',
      quoteId,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to send PDF notification:', error);
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
