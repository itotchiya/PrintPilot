import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/super-admin/defaults
 * Get all default configuration values (Super Admin only)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionCheck = checkPermission(session.user.role, 'CONFIGURE_DEFAULTS');
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.reason }, { status: 403 });
    }

    // Fetch all default configs (where supplierId is null)
    const [
      paperTypes,
      formatPresets,
      colorModes,
      bindingTypes,
      foldTypes,
      laminationModes,
      laminationFinishes,
      packagingOptions,
      carriers,
      offsetConfigs,
      digitalConfigs,
      marginConfigs,
      machineFormats,
      formatClickDivisors,
      digitalCutTiers,
    ] = await Promise.all([
      prisma.paperType.findMany({
        where: { supplierId: null },
        include: { grammages: true },
      }),
      prisma.formatPreset.findMany({
        where: { supplierId: null },
      }),
      prisma.colorMode.findMany({
        where: { supplierId: null },
      }),
      prisma.bindingType.findMany({
        where: { supplierId: null },
        include: {
          digitalPriceTiers: true,
          offsetPriceTiers: true,
        },
      }),
      prisma.foldType.findMany({
        where: { supplierId: null },
        include: { costs: true },
      }),
      prisma.laminationMode.findMany({
        where: { supplierId: null },
      }),
      prisma.laminationFinish.findMany({
        where: { supplierId: null },
        include: { digitalPriceTiers: true },
      }),
      prisma.packagingOption.findMany({
        where: { supplierId: null },
      }),
      prisma.carrier.findMany({
        where: { supplierId: null },
        include: {
          deliveryRates: true,
          transportRatesByDept: true,
        },
      }),
      prisma.offsetConfig.findMany({
        where: { supplierId: null },
      }),
      prisma.digitalConfig.findMany({
        where: { supplierId: null },
      }),
      prisma.marginConfig.findMany({
        where: { supplierId: null },
      }),
      prisma.machineFormat.findMany({
        where: { supplierId: null },
      }),
      prisma.formatClickDivisor.findMany({
        where: { supplierId: null },
      }),
      prisma.digitalCutTier.findMany({
        where: { supplierId: null },
      }),
    ]);

    return NextResponse.json({
      defaults: {
        paperTypes,
        formatPresets,
        colorModes,
        bindingTypes,
        foldTypes,
        laminationModes,
        laminationFinishes,
        packagingOptions,
        carriers,
        offsetConfigs,
        digitalConfigs,
        marginConfigs,
        machineFormats,
        formatClickDivisors,
        digitalCutTiers,
      },
    });
  } catch (error) {
    console.error('Default config fetch error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch default configuration' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/super-admin/defaults/copy-to-supplier
 * Copy default configuration to a specific supplier
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const permissionCheck = checkPermission(session.user.role, 'CONFIGURE_ANY_SUPPLIER');
    if (!permissionCheck.allowed) {
      return NextResponse.json({ error: permissionCheck.reason }, { status: 403 });
    }

    const body = await req.json();
    const { supplierId, categories } = body;

    if (!supplierId) {
      return NextResponse.json(
        { error: 'Supplier ID is required' },
        { status: 400 }
      );
    }

    // Verify supplier exists
    const supplier = await prisma.supplierProfile.findUnique({
      where: { id: supplierId },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: 'Supplier not found' },
        { status: 404 }
      );
    }

    // Categories to copy (defaults to all if not specified)
    const categoriesToCopy = categories || [
      'paperTypes',
      'formatPresets',
      'colorModes',
      'bindingTypes',
      'foldTypes',
      'laminationModes',
      'laminationFinishes',
      'packagingOptions',
      'carriers',
      'offsetConfigs',
      'digitalConfigs',
      'marginConfigs',
      'machineFormats',
      'formatClickDivisors',
      'digitalCutTiers',
    ];

    // Copy each category
    const results: Record<string, { copied: number; skipped: number }> = {};

    await prisma.$transaction(async (tx) => {
      // Paper Types
      if (categoriesToCopy.includes('paperTypes')) {
        const defaults = await tx.paperType.findMany({
          where: { supplierId: null },
          include: { grammages: true },
        });

        let copied = 0;
        let skipped = 0;

        for (const defaultType of defaults) {
          const exists = await tx.paperType.findFirst({
            where: { supplierId, name: defaultType.name },
          });

          if (!exists) {
            await tx.paperType.create({
              data: {
                supplierId,
                name: defaultType.name,
                category: defaultType.category,
                active: defaultType.active,
                sortOrder: defaultType.sortOrder,
                grammages: {
                  create: defaultType.grammages.map((g) => ({
                    grammage: g.grammage,
                    pricePerKg: g.pricePerKg,
                    weightPer1000Sheets: g.weightPer1000Sheets,
                    thicknessPer100: g.thicknessPer100,
                    availableForDosCarre: g.availableForDosCarre,
                    active: g.active,
                  })),
                },
              },
            });
            copied++;
          } else {
            skipped++;
          }
        }

        results.paperTypes = { copied, skipped };
        
        await tx.supplierConfigStatus.update({
          where: { supplierId },
          data: { hasPaperTypes: true },
        });
      }

      // Format Presets
      if (categoriesToCopy.includes('formatPresets')) {
        const defaults = await tx.formatPreset.findMany({
          where: { supplierId: null },
        });

        let copied = 0;
        let skipped = 0;

        for (const defaultPreset of defaults) {
          const exists = await tx.formatPreset.findFirst({
            where: { supplierId, name: defaultPreset.name },
          });

          if (!exists) {
            await tx.formatPreset.create({
              data: {
                supplierId,
                name: defaultPreset.name,
                widthCm: defaultPreset.widthCm,
                heightCm: defaultPreset.heightCm,
                orientation: defaultPreset.orientation,
                productTypes: defaultPreset.productTypes as any,
                active: defaultPreset.active,
              },
            });
            copied++;
          } else {
            skipped++;
          }
        }

        results.formatPresets = { copied, skipped };
        
        await tx.supplierConfigStatus.update({
          where: { supplierId },
          data: { hasFormatPresets: true },
        });
      }

      // Color Modes
      if (categoriesToCopy.includes('colorModes')) {
        const defaults = await tx.colorMode.findMany({
          where: { supplierId: null },
        });

        let copied = 0;
        let skipped = 0;

        for (const defaultMode of defaults) {
          const exists = await tx.colorMode.findFirst({
            where: { supplierId, name: defaultMode.name },
          });

          if (!exists) {
            await tx.colorMode.create({
              data: {
                supplierId,
                name: defaultMode.name,
                platesPerSide: defaultMode.platesPerSide,
                hasVarnish: defaultMode.hasVarnish,
                clickMultiplier: defaultMode.clickMultiplier,
                active: defaultMode.active,
              },
            });
            copied++;
          } else {
            skipped++;
          }
        }

        results.colorModes = { copied, skipped };
        
        await tx.supplierConfigStatus.update({
          where: { supplierId },
          data: { hasColorModes: true },
        });
      }

      // Offset Configs
      if (categoriesToCopy.includes('offsetConfigs')) {
        const defaults = await tx.offsetConfig.findMany({
          where: { supplierId: null },
        });

        let copied = 0;
        let skipped = 0;

        for (const defaultConfig of defaults) {
          const exists = await tx.offsetConfig.findUnique({
            where: { supplierId_key: { supplierId, key: defaultConfig.key } },
          });

          if (!exists) {
            await tx.offsetConfig.create({
              data: {
                supplierId,
                key: defaultConfig.key,
                value: defaultConfig.value,
                unit: defaultConfig.unit,
                description: defaultConfig.description,
              },
            });
            copied++;
          } else {
            skipped++;
          }
        }

        results.offsetConfigs = { copied, skipped };
        
        await tx.supplierConfigStatus.update({
          where: { supplierId },
          data: { hasOffsetConfig: true },
        });
      }

      // Digital Configs
      if (categoriesToCopy.includes('digitalConfigs')) {
        const defaults = await tx.digitalConfig.findMany({
          where: { supplierId: null },
        });

        let copied = 0;
        let skipped = 0;

        for (const defaultConfig of defaults) {
          const exists = await tx.digitalConfig.findUnique({
            where: { supplierId_key: { supplierId, key: defaultConfig.key } },
          });

          if (!exists) {
            await tx.digitalConfig.create({
              data: {
                supplierId,
                key: defaultConfig.key,
                value: defaultConfig.value,
                unit: defaultConfig.unit,
                description: defaultConfig.description,
              },
            });
            copied++;
          } else {
            skipped++;
          }
        }

        results.digitalConfigs = { copied, skipped };
        
        await tx.supplierConfigStatus.update({
          where: { supplierId },
          data: { hasDigitalConfig: true },
        });
      }

      // Margin Configs
      if (categoriesToCopy.includes('marginConfigs')) {
        const defaults = await tx.marginConfig.findMany({
          where: { supplierId: null },
        });

        let copied = 0;
        let skipped = 0;

        for (const defaultConfig of defaults) {
          const exists = await tx.marginConfig.findUnique({
            where: { supplierId_key: { supplierId, key: defaultConfig.key } },
          });

          if (!exists) {
            await tx.marginConfig.create({
              data: {
                supplierId,
                key: defaultConfig.key,
                value: defaultConfig.value,
                unit: defaultConfig.unit,
                description: defaultConfig.description,
              },
            });
            copied++;
          } else {
            skipped++;
          }
        }

        results.marginConfigs = { copied, skipped };
        
        await tx.supplierConfigStatus.update({
          where: { supplierId },
          data: { hasMarginConfig: true },
        });
      }

      // Update supplier to not use default config anymore
      if (Object.keys(results).length > 0) {
        await tx.supplierProfile.update({
          where: { id: supplierId },
          data: {
            usesDefaultConfig: false,
          },
        });
      }

      // Update last copied timestamp
      await tx.supplierConfigStatus.update({
        where: { supplierId },
        data: { lastCopiedAt: new Date() },
      });
    });

    return NextResponse.json({
      success: true,
      message: 'Default configuration copied successfully',
      results,
    });
  } catch (error) {
    console.error('Default config copy error:', error);
    return NextResponse.json(
      { error: 'Failed to copy default configuration' },
      { status: 500 }
    );
  }
}
