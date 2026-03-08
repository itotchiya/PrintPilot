import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all suppliers the client has access to
    const supplierAccess = await prisma.supplierClientAccess.findMany({
      where: { 
        clientId: session.user.id,
      },
      orderBy: { invitedAt: 'desc' },
      select: {
        supplier: {
          select: {
            id: true,
            companyName: true,
            logoUrl: true,
            primaryColor: true,
          },
        },
      },
    });

    const suppliers = supplierAccess.map(access => access.supplier);

    return NextResponse.json({ suppliers });
  } catch (error) {
    console.error('Failed to fetch client suppliers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch suppliers' },
      { status: 500 }
    );
  }
}
