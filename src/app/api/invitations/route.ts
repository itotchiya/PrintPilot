import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendSupplierInvitation, sendClientInvitation } from '@/lib/email/resend';
import { randomBytes } from 'crypto';
import { addDays } from 'date-fns';
import { checkPermission } from '@/lib/permissions';
import { checkRateLimit, createRateLimitResponse, RateLimits } from '@/lib/security/rate-limit';
import { RateLimitKeys } from '@/lib/security/validation';
import { emailSchema, companyNameSchema } from '@/lib/security/validation';

/**
 * POST /api/invitations
 * Create a new invitation (SUPPLIER or CLIENT)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Apply rate limiting
    const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                     req.headers.get('x-real-ip') || 
                     'unknown';
    const rateLimitKey = RateLimitKeys.byUser(session.user.id || clientIp);
    const rateLimitResult = checkRateLimit(rateLimitKey, RateLimits.invitations.create);

    if (!rateLimitResult.allowed) {
      return createRateLimitResponse(rateLimitResult);
    }

    const body = await req.json();
    const { email, type, companyName, supplierId } = body;

    // Validate required fields
    if (!email || !type) {
      return NextResponse.json(
        { error: 'Email and type are required' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailValidation = emailSchema.safeParse(email);
    if (!emailValidation.success) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate company name for supplier invitations
    if (type === 'SUPPLIER' && companyName) {
      const nameValidation = companyNameSchema.safeParse(companyName);
      if (!nameValidation.success) {
        return NextResponse.json(
          { error: 'Invalid company name' },
          { status: 400 }
        );
      }
    }

    // Validate type
    if (!['SUPPLIER', 'CLIENT'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid invitation type' },
        { status: 400 }
      );
    }

    // Check permissions
    const permission = type === 'SUPPLIER' ? 'INVITE_SUPPLIER' : 'INVITE_CLIENT';
    const permissionCheck = checkPermission(session.user.role, permission);
    
    if (!permissionCheck.allowed) {
      return NextResponse.json(
        { error: permissionCheck.reason },
        { status: 403 }
      );
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: 'A user with this email already exists' },
        { status: 400 }
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await prisma.invitation.findFirst({
      where: {
        email: email.toLowerCase(),
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: 'An active invitation already exists for this email' },
        { status: 400 }
      );
    }

    // Generate invitation token
    const token = randomBytes(32).toString('hex');
    const expiresAt = addDays(new Date(), 7);

    // Create invitation
    const invitation = await prisma.invitation.create({
      data: {
        email: email.toLowerCase(),
        token,
        type,
        invitedBy: session.user.id,
        supplierId: type === 'CLIENT' ? supplierId || session.user.supplierProfile?.id : null,
        companyName: type === 'SUPPLIER' ? companyName : null,
        expiresAt,
      },
    });

    // Send invitation email
    try {
      if (type === 'SUPPLIER') {
        await sendSupplierInvitation(email, token, companyName);
      } else {
        // Get supplier info for client invitation
        const supplier = await prisma.supplierProfile.findUnique({
          where: { id: supplierId || session.user.supplierProfile?.id },
          include: { user: true },
        });

        if (!supplier) {
          return NextResponse.json(
            { error: 'Supplier not found' },
            { status: 400 }
          );
        }

        await sendClientInvitation(
          email,
          token,
          supplier.companyName,
          supplier.logoUrl
        );
      }
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      // Don't fail the request, just log the error
      // The admin can resend the invitation if needed
    }

    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        email: invitation.email,
        type: invitation.type,
        expiresAt: invitation.expiresAt,
      },
    });
  } catch (error) {
    console.error('Invitation creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create invitation' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/invitations
 * List invitations (filtered by role)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';

    let where: any = {};

    // Super Admin can see all supplier invitations
    if (session.user.role === 'SUPER_ADMIN') {
      where = {
        type: 'SUPPLIER',
        status,
      };
    } 
    // Suppliers can see their client invitations
    else if (session.user.role === 'SUPPLIER' || session.user.role === 'FOURNISSEUR') {
      where = {
        type: 'CLIENT',
        supplierId: session.user.supplierProfile?.id,
        status,
      };
    } else {
      return NextResponse.json(
        { error: 'Not authorized to view invitations' },
        { status: 403 }
      );
    }

    const invitations = await prisma.invitation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    
    // Fetch supplier details for client invitations
    const invitationsWithSupplier = await Promise.all(
      invitations.map(async (inv) => {
        if (inv.supplierId) {
          const supplier = await prisma.supplierProfile.findUnique({
            where: { id: inv.supplierId },
            select: { companyName: true },
          });
          return { ...inv, supplier };
        }
        return { ...inv, supplier: null };
      })
    );

    return NextResponse.json({ invitations: invitationsWithSupplier });
  } catch (error) {
    console.error('Invitation list error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invitations' },
      { status: 500 }
    );
  }
}
