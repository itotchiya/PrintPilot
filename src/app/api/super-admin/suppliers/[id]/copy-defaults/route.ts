import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPermission } from '@/lib/permissions';
import { copyDefaultConfigToSupplier } from '@/lib/supplier/config';

/**
 * POST /api/super-admin/suppliers/[id]/copy-defaults
 * Copy default configuration to a specific supplier
 */
export async function POST(
  req: NextRequest,
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
    const body = await req.json();
    const { categories } = body; // Optional: specific categories to copy

    // Verify supplier exists
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id },
    });

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 });
    }

    // Copy defaults
    const result = await copyDefaultConfigToSupplier(id, categories);

    if (!result.success) {
      return NextResponse.json(
        { error: result.message },
        { status: 500 }
      );
    }

    // Log the action
    await prisma.activityLog.create({
      data: {
        supplierId: id,
        type: 'CONFIG_UPDATED',
        metadata: {
          action: 'DEFAULTS_COPIED',
          categories: categories || 'all',
          performedBy: session.user.id,
          performedByName: session.user.name,
          results: result.results,
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: result.message,
      results: result.results,
    });
  } catch (error) {
    console.error('Copy defaults error:', error);
    return NextResponse.json(
      { error: 'Failed to copy default configuration' },
      { status: 500 }
    );
  }
}
