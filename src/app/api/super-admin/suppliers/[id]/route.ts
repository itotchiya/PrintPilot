import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPermission } from '@/lib/permissions';
import { sendWelcomeEmail } from '@/lib/email/resend';

/**
 * GET /api/super-admin/suppliers/[id]
 * Get detailed supplier information
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionCheck = checkPermission(session.user.role, 'CONFIGURE_ANY_SUPPLIER');
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.reason }, { status: 403 });
    }

    const { id } = await params;

    const supplier = await prisma.supplierProfile.findUnique({
      where: { id },
      include: {
        user: {
          select: { name: true, email: true, createdAt: true, updatedAt: true },
        },
        clients: {
          include: {
            client: {
              select: { name: true, email: true, createdAt: true },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { clients: true },
        },
      },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Get additional stats
    const [quoteCount, recentQuotes, activityLog] = await Promise.all([
      prisma.quote.count({
        where: {
          OR: [
            { userId: supplier.userId },
            {
              multiSupplierResults: {
                path: [supplier.id],
                not: undefined,
              },
            },
          ],
        },
      }),
      prisma.quote.findMany({
        where: {
          OR: [
            { userId: supplier.userId },
            {
              multiSupplierResults: {
                path: [supplier.id],
                not: undefined,
              },
            },
          ],
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          quoteNumber: true,
          productType: true,
          quantity: true,
          createdAt: true,
        },
      }),
      prisma.activityLog.findMany({
        where: { supplierId: supplier.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    return NextResponse.json({
      supplier: {
        ...supplier,
        quoteCount,
        recentQuotes,
        activityLog,
      },
    });
  } catch (error) {
    console.error('Supplier fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch supplier' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/super-admin/suppliers/[id]
 * Update supplier status (suspend/reactivate)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionCheck = checkPermission(session.user.role, 'SUSPEND_SUPPLIER');
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.reason }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json();
    const { isActive, subscriptionStatus } = body;

    const supplier = await prisma.supplierProfile.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    const updateData: any = {};
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    if (subscriptionStatus) {
      updateData.subscriptionStatus = subscriptionStatus;
    }

    const updatedSupplier = await prisma.supplierProfile.update({
      where: { id },
      data: updateData,
    });

    // Log the status change
    await prisma.activityLog.create({
      data: {
        supplierId: id,
        type: 'CONFIG_UPDATED',
        metadata: {
          action: isActive ? 'REACTIVATED' : 'SUSPENDED',
          performedBy: session.user.id,
          performedByName: session.user.name,
        },
      },
    });

    return NextResponse.json({
      success: true,
      supplier: updatedSupplier,
      message: isActive 
        ? 'Supplier account reactivated' 
        : 'Supplier account suspended',
    });
  } catch (error) {
    console.error('Supplier update error:', error);
    return NextResponse.json(
      { error: 'Failed to update supplier' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/super-admin/suppliers/[id]
 * Delete supplier account (use with caution)
 */
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionCheck = checkPermission(session.user.role, 'SUSPEND_SUPPLIER');
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.reason }, { status: 403 });
    }

    const { id } = await params;

    const supplier = await prisma.supplierProfile.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Delete the associated user (cascade will handle the rest)
    await prisma.user.delete({
      where: { id: supplier.userId },
    });

    return NextResponse.json({
      success: true,
      message: 'Supplier account deleted',
    });
  } catch (error) {
    console.error('Supplier delete error:', error);
    return NextResponse.json(
      { error: 'Failed to delete supplier' },
      { status: 500 }
    );
  }
}
