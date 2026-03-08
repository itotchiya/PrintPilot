import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/super-admin/suppliers
 * Get all suppliers with filtering
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionCheck = checkPermission(session.user.role, 'VIEW_GLOBAL_DASHBOARD');
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.reason }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const where: any = {};

    if (search) {
      where.OR = [
        { companyName: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } },
        { user: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (status && status !== 'all') {
      where.subscriptionStatus = status.toUpperCase();
    }

    const skip = (page - 1) * limit;

    const [suppliers, total] = await Promise.all([
      prisma.supplierProfile.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: {
            select: { name: true, email: true, createdAt: true },
          },
          _count: {
            select: { clients: true },
          },
        },
      }),
      prisma.supplierProfile.count({ where }),
    ]);

    // Get quote counts for each supplier
    const suppliersWithStats = await Promise.all(
      suppliers.map(async (supplier) => {
        const quoteCount = await prisma.quote.count({
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
        });

        const recentActivity = await prisma.activityLog.count({
          where: {
            supplierId: supplier.id,
            createdAt: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            },
          },
        });

        return {
          ...supplier,
          quoteCount,
          recentActivity,
        };
      })
    );

    return NextResponse.json({
      suppliers: suppliersWithStats,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Suppliers fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}
