import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/invitations/[token]
 * Get invitation details (public, no auth required)
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await prisma.invitation.findUnique({
      where: { token },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invitation not found' },
        { status: 404 }
      );
    }

    // Check if expired
    if (invitation.expiresAt < new Date()) {
      // Update status to expired
      await prisma.invitation.update({
        where: { id: invitation.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { error: 'Invitation has expired' },
        { status: 410 }
      );
    }

    // Check if already accepted
    if (invitation.status === 'ACCEPTED') {
      return NextResponse.json(
        { error: 'Invitation has already been used' },
        { status: 410 }
      );
    }
    
    // Fetch supplier separately if this is a client invitation
    let supplier = null;
    if (invitation.supplierId) {
      supplier = await prisma.supplierProfile.findUnique({
        where: { id: invitation.supplierId },
        select: {
          companyName: true,
          logoUrl: true,
        },
      });
    }

    return NextResponse.json({
      invitation: {
        id: invitation.id,
        email: invitation.email,
        type: invitation.type,
        companyName: invitation.companyName,
        supplier,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Invitation fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    );
  }
}
