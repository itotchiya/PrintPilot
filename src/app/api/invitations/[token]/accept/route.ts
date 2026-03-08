import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { sendWelcomeEmail } from '@/lib/email/resend';

/**
 * POST /api/invitations/[token]/accept
 * Accept invitation and create account
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const body = await req.json();
    const { name, password } = body;

    // Validate required fields
    if (!name || !password) {
      return NextResponse.json(
        { error: 'Name and password are required' },
        { status: 400 }
      );
    }

    // Validate password strength
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    // Find invitation
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

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invitation.email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Determine role based on invitation type
    const role = invitation.type === 'SUPPLIER' ? 'SUPPLIER' : 'CLIENT';

    // Create user and related records in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const user = await tx.user.create({
        data: {
          name,
          email: invitation.email,
          passwordHash,
          role,
          emailVerified: new Date(),
          invitedBy: invitation.invitedBy,
        },
      });

      // Create supplier profile if applicable
      if (invitation.type === 'SUPPLIER') {
        await tx.supplierProfile.create({
          data: {
            userId: user.id,
            companyName: invitation.companyName || name,
            isActive: true,
            subscriptionStatus: 'TRIAL',
            planType: 'trial',
            usesDefaultConfig: true,
          },
        });

        // Create default config status record
        await tx.supplierConfigStatus.create({
          data: {
            supplierId: user.id,
          },
        });
      }

      // Create supplier-client access if client invitation
      if (invitation.type === 'CLIENT' && invitation.supplierId) {
        await tx.supplierClientAccess.create({
          data: {
            supplierId: invitation.supplierId,
            clientId: user.id,
            invitedBy: invitation.invitedBy,
          },
        });
      }

      // Mark invitation as accepted
      await tx.invitation.update({
        where: { id: invitation.id },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
          acceptedByUserId: user.id,
        },
      });

      return user;
    });

    // Send welcome email
    try {
      await sendWelcomeEmail(
        invitation.email,
        name,
        role as 'SUPPLIER' | 'CLIENT'
      );
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Don't fail the request
    }

    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      user: {
        id: result.id,
        name: result.name,
        email: result.email,
        role: result.role,
      },
    });
  } catch (error) {
    console.error('Invitation acceptance error:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
