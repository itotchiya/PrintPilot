import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendClientInvitation } from '@/lib/email/resend';

/**
 * POST /api/supplier/onboarding/complete
 * Complete supplier onboarding
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyName, address, phone, website, primaryColor, clientEmail } = body;

    const supplierProfile = await prisma.supplierProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!supplierProfile) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 });
    }

    // Update supplier profile with onboarding data
    await prisma.supplierProfile.update({
      where: { id: supplierProfile.id },
      data: {
        companyName: companyName || supplierProfile.companyName,
        primaryColor: primaryColor || supplierProfile.primaryColor,
        address: address || null,
        phone: phone || null,
        website: website || null,
        onboardingStep: 'COMPLETE',
        onboardingCompletedAt: new Date(),
        isActive: true,
      },
    });

    // Create invitation for first client if provided
    if (clientEmail) {
      const crypto = require('crypto');
      const { addDays } = require('date-fns');
      
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = addDays(new Date(), 7);

      await prisma.invitation.create({
        data: {
          email: clientEmail.toLowerCase(),
          token,
          type: 'CLIENT',
          invitedBy: session.user.id,
          supplierId: supplierProfile.id,
          expiresAt,
        },
      });

      // Send invitation email
      try {
        await sendClientInvitation(
          clientEmail,
          token,
          companyName || supplierProfile.companyName,
          supplierProfile.logoUrl
        );
      } catch (emailError) {
        console.error('Failed to send invitation email:', emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Onboarding completed successfully',
    });
  } catch (error) {
    console.error('Onboarding completion error:', error);
    return NextResponse.json(
      { error: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
}
