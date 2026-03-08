import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/supplier/branding
 * Get supplier branding information
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supplierProfile = await prisma.supplierProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!supplierProfile) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 });
    }

    return NextResponse.json({
      companyName: supplierProfile.companyName,
      logoUrl: supplierProfile.logoUrl,
      primaryColor: supplierProfile.primaryColor,
      address: supplierProfile.address,
      phone: supplierProfile.phone,
      website: supplierProfile.website,
    });
  } catch (error) {
    console.error('Branding fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch branding information' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/supplier/branding
 * Update supplier branding
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { companyName, primaryColor, address, phone, website, logoUrl } = body;

    const supplierProfile = await prisma.supplierProfile.findUnique({
      where: { userId: session.user.id },
    });

    if (!supplierProfile) {
      return NextResponse.json({ error: 'Supplier profile not found' }, { status: 404 });
    }

    const updatedProfile = await prisma.supplierProfile.update({
      where: { id: supplierProfile.id },
      data: {
        companyName: companyName || supplierProfile.companyName,
        primaryColor: primaryColor || supplierProfile.primaryColor,
        address: address || null,
        phone: phone || null,
        website: website || null,
        logoUrl: logoUrl || supplierProfile.logoUrl,
      },
    });

    return NextResponse.json({
      success: true,
      branding: {
        companyName: updatedProfile.companyName,
        logoUrl: updatedProfile.logoUrl,
        primaryColor: updatedProfile.primaryColor,
        address: updatedProfile.address,
        phone: updatedProfile.phone,
        website: updatedProfile.website,
      },
    });
  } catch (error) {
    console.error('Branding update error:', error);
    return NextResponse.json(
      { error: 'Failed to update branding' },
      { status: 500 }
    );
  }
}
