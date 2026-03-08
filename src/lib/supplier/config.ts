import { prisma } from '@/lib/prisma';

/**
 * Check if a supplier has configuration copied from defaults
 */
export async function hasSupplierConfig(supplierId: string): Promise<boolean> {
  const configStatus = await prisma.supplierConfigStatus.findUnique({
    where: { supplierId },
  });

  if (!configStatus) {
    return false;
  }

  // Check if any config category has been copied
  return (
    configStatus.hasPaperTypes ||
    configStatus.hasFormatPresets ||
    configStatus.hasColorModes ||
    configStatus.hasOffsetConfig ||
    configStatus.hasDigitalConfig
  );
}

/**
 * Get supplier configuration status
 */
export async function getSupplierConfigStatus(supplierId: string) {
  const configStatus = await prisma.supplierConfigStatus.findUnique({
    where: { supplierId },
  });

  if (!configStatus) {
    return null;
  }

  const completedCategories = [
    configStatus.hasPaperTypes && 'paperTypes',
    configStatus.hasFormatPresets && 'formatPresets',
    configStatus.hasColorModes && 'colorModes',
    configStatus.hasBindingTypes && 'bindingTypes',
    configStatus.hasFoldTypes && 'foldTypes',
    configStatus.hasLamination && 'lamination',
    configStatus.hasPackaging && 'packaging',
    configStatus.hasCarriers && 'carriers',
    configStatus.hasOffsetConfig && 'offsetConfig',
    configStatus.hasDigitalConfig && 'digitalConfig',
    configStatus.hasMarginConfig && 'marginConfig',
    configStatus.hasMachineFormats && 'machineFormats',
    configStatus.hasDigitalCutTiers && 'digitalCutTiers',
  ].filter(Boolean) as string[];

  const totalCategories = 13;
  const completionPercentage = Math.round(
    (completedCategories.length / totalCategories) * 100
  );

  return {
    ...configStatus,
    completedCategories,
    completionPercentage,
    isComplete: completionPercentage === 100,
  };
}

/**
 * Copy default configuration to a new supplier
 * This is called when a supplier is first created or when they request to copy defaults
 */
export async function copyDefaultConfigToSupplier(
  supplierId: string,
  categories?: string[]
): Promise<{ success: boolean; message: string; results?: any }> {
  try {
    // Categories to copy (defaults to essential categories)
    const categoriesToCopy = categories || [
      'paperTypes',
      'formatPresets',
      'colorModes',
      'offsetConfigs',
      'digitalConfigs',
      'marginConfigs',
    ];

    const results: Record<string, { copied: number; skipped: number }> = {};

    await prisma.$transaction(async (tx) => {
      // Ensure supplier config status exists
      await tx.supplierConfigStatus.upsert({
        where: { supplierId },
        create: { supplierId },
        update: {},
      });

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
            where: {
              supplierId_key: { supplierId, key: defaultConfig.key },
            },
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
            where: {
              supplierId_key: { supplierId, key: defaultConfig.key },
            },
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
            where: {
              supplierId_key: { supplierId, key: defaultConfig.key },
            },
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

      // Update supplier to not use default config
      await tx.supplierProfile.update({
        where: { id: supplierId },
        data: {
          usesDefaultConfig: false,
        },
      });

      // Update last copied timestamp
      await tx.supplierConfigStatus.update({
        where: { supplierId },
        data: { lastCopiedAt: new Date() },
      });
    });

    return {
      success: true,
      message: 'Default configuration copied successfully',
      results,
    };
  } catch (error) {
    console.error('Copy default config error:', error);
    return {
      success: false,
      message: 'Failed to copy default configuration',
    };
  }
}

/**
 * Get all configuration for a supplier (or default if supplier has no config)
 */
export async function getSupplierConfig(supplierId: string | null) {
  const whereClause = supplierId ? { supplierId } : { supplierId: null };

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
      where: whereClause,
      include: { grammages: true },
    }),
    prisma.formatPreset.findMany({ where: whereClause }),
    prisma.colorMode.findMany({ where: whereClause }),
    prisma.bindingType.findMany({
      where: whereClause,
      include: {
        digitalPriceTiers: true,
        offsetPriceTiers: true,
      },
    }),
    prisma.foldType.findMany({
      where: whereClause,
      include: { costs: true },
    }),
    prisma.laminationMode.findMany({ where: whereClause }),
    prisma.laminationFinish.findMany({
      where: whereClause,
      include: { digitalPriceTiers: true },
    }),
    prisma.packagingOption.findMany({ where: whereClause }),
    prisma.carrier.findMany({
      where: whereClause,
      include: {
        deliveryRates: true,
        transportRatesByDept: true,
      },
    }),
    prisma.offsetConfig.findMany({ where: whereClause }),
    prisma.digitalConfig.findMany({ where: whereClause }),
    prisma.marginConfig.findMany({ where: whereClause }),
    prisma.machineFormat.findMany({ where: whereClause }),
    prisma.formatClickDivisor.findMany({ where: whereClause }),
    prisma.digitalCutTier.findMany({ where: whereClause }),
  ]);

  return {
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
  };
}

/**
 * Initialize default configuration for the platform
 * This should be called during seeding or first setup
 */
export async function initializeDefaultConfig() {
  // Check if defaults already exist
  const existingDefaults = await prisma.paperType.findFirst({
    where: { supplierId: null },
  });

  if (existingDefaults) {
    return { success: true, message: 'Default configuration already exists' };
  }

  // Create basic default configuration
  // This is a minimal setup - Super Admin should configure the full defaults via UI
  await prisma.$transaction(async (tx) => {
    // Create default paper types
    await tx.paperType.create({
      data: {
        supplierId: null,
        name: 'Standard Gloss',
        category: 'BOTH',
        grammages: {
          create: [
            { grammage: 90, pricePerKg: 2.5 },
            { grammage: 135, pricePerKg: 3.0 },
            { grammage: 170, pricePerKg: 3.5 },
          ],
        },
      },
    });

    // Create default format presets
    await tx.formatPreset.createMany({
      data: [
        { supplierId: null, name: 'A4', widthCm: 21.0, heightCm: 29.7 },
        { supplierId: null, name: 'A5', widthCm: 14.8, heightCm: 21.0 },
        { supplierId: null, name: 'A6', widthCm: 10.5, heightCm: 14.8 },
      ],
    });

    // Create default color modes
    await tx.colorMode.createMany({
      data: [
        { supplierId: null, name: 'Noir/Blanc', platesPerSide: 1 },
        { supplierId: null, name: '4/0 Couleur', platesPerSide: 4 },
        { supplierId: null, name: '4/4 Couleur', platesPerSide: 4 },
      ],
    });

    // Create default offset configs
    await tx.offsetConfig.createMany({
      data: [
        { supplierId: null, key: 'plate_cost', value: 10.0, unit: 'MAD', description: 'Cost per plate' },
        { supplierId: null, key: 'calage_base', value: 50.0, unit: 'MAD', description: 'Base calage cost' },
      ],
    });

    // Create default digital configs
    await tx.digitalConfig.createMany({
      data: [
        { supplierId: null, key: 'click_cost_bw', value: 0.02, unit: 'MAD', description: 'Cost per B&W click' },
        { supplierId: null, key: 'click_cost_color', value: 0.08, unit: 'MAD', description: 'Cost per color click' },
      ],
    });

    // Create default margin configs
    await tx.marginConfig.createMany({
      data: [
        { supplierId: null, key: 'digital_markup', value: 1.5, description: 'Digital markup multiplier' },
        { supplierId: null, key: 'offset_markup', value: 1.3, description: 'Offset markup multiplier' },
        { supplierId: null, key: 'paper_margin', value: 0.15, description: 'Paper margin percentage' },
      ],
    });
  });

  return { success: true, message: 'Default configuration initialized' };
}
