import { prisma } from "@/lib/prisma";

export async function copyDefaultConfigToFournisseur(fid: string) {
  const copyScalar = (v: unknown): number =>
    typeof v === "object" && v !== null && "toNumber" in v ? (v as { toNumber: () => number }).toNumber() : Number(v);

  const defaultPaperTypes = await prisma.paperType.findMany({ where: { fournisseurId: null }, include: { grammages: true } });
  for (const pt of defaultPaperTypes) {
    const created = await prisma.paperType.create({
      data: { fournisseurId: fid, name: pt.name, category: pt.category, active: pt.active, sortOrder: pt.sortOrder },
    });
    for (const g of pt.grammages) {
      await prisma.paperGrammage.create({
        data: {
          paperTypeId: created.id,
          grammage: g.grammage,
          pricePerKg: copyScalar(g.pricePerKg) ?? g.pricePerKg,
          weightPer1000Sheets: g.weightPer1000Sheets != null ? copyScalar(g.weightPer1000Sheets) : null,
          availableForDosCarre: g.availableForDosCarre,
        },
      });
    }
  }

  const defaultFormatPresets = await prisma.formatPreset.findMany({ where: { fournisseurId: null } });
  for (const fp of defaultFormatPresets) {
    await prisma.formatPreset.create({
      data: {
        fournisseurId: fid,
        name: fp.name,
        widthCm: copyScalar(fp.widthCm),
        heightCm: copyScalar(fp.heightCm),
        orientation: fp.orientation,
        productTypes: fp.productTypes as object,
        active: fp.active,
      },
    });
  }

  const defaultColorModes = await prisma.colorMode.findMany({ where: { fournisseurId: null } });
  for (const cm of defaultColorModes) {
    await prisma.colorMode.create({
      data: {
        fournisseurId: fid,
        name: cm.name,
        platesPerSide: cm.platesPerSide,
        hasVarnish: cm.hasVarnish,
        clickMultiplier: copyScalar(cm.clickMultiplier),
        active: cm.active,
      },
    });
  }

  const defaultBindingTypes = await prisma.bindingType.findMany({
    where: { fournisseurId: null },
    include: { digitalPriceTiers: true, offsetPriceTiers: true },
  });
  for (const bt of defaultBindingTypes) {
    const created = await prisma.bindingType.create({
      data: { fournisseurId: fid, name: bt.name, minPages: bt.minPages, maxPages: bt.maxPages, active: bt.active },
    });
    for (const t of bt.digitalPriceTiers) {
      await prisma.bindingPriceTierDigital.create({
        data: {
          bindingTypeId: created.id,
          pageRangeMin: t.pageRangeMin,
          pageRangeMax: t.pageRangeMax,
          qtyMin: t.qtyMin,
          qtyMax: t.qtyMax,
          perUnitCost: copyScalar(t.perUnitCost),
          setupCost: copyScalar(t.setupCost),
        },
      });
    }
    for (const t of bt.offsetPriceTiers) {
      await prisma.bindingPriceTierOffset.create({
        data: {
          bindingTypeId: created.id,
          cahiersCount: t.cahiersCount,
          calageCost: copyScalar(t.calageCost),
          roulagePer1000: copyScalar(t.roulagePer1000),
        },
      });
    }
  }

  const defaultFoldTypes = await prisma.foldType.findMany({ where: { fournisseurId: null }, include: { costs: true } });
  for (const ft of defaultFoldTypes) {
    const created = await prisma.foldType.create({
      data: { fournisseurId: fid, name: ft.name, maxFolds: ft.maxFolds, canBeSecondary: ft.canBeSecondary, active: ft.active },
    });
    for (const fc of ft.costs) {
      await prisma.foldCost.create({
        data: { foldTypeId: created.id, numFolds: fc.numFolds, cost: copyScalar(fc.cost) },
      });
    }
  }

  const defaultLaminationModes = await prisma.laminationMode.findMany({ where: { fournisseurId: null } });
  for (const lm of defaultLaminationModes) {
    await prisma.laminationMode.create({ data: { fournisseurId: fid, name: lm.name } });
  }

  const defaultLaminationFinishes = await prisma.laminationFinish.findMany({
    where: { fournisseurId: null },
    include: { digitalPriceTiers: true },
  });
  for (const lf of defaultLaminationFinishes) {
    const created = await prisma.laminationFinish.create({
      data: {
        fournisseurId: fid,
        name: lf.name,
        offsetPricePerM2: lf.offsetPricePerM2 != null ? copyScalar(lf.offsetPricePerM2) : null,
        offsetCalageForfait: lf.offsetCalageForfait != null ? copyScalar(lf.offsetCalageForfait) : null,
        offsetMinimumBilling: lf.offsetMinimumBilling != null ? copyScalar(lf.offsetMinimumBilling) : null,
        active: lf.active,
      },
    });
    for (const t of lf.digitalPriceTiers) {
      await prisma.laminationPriceTier.create({
        data: {
          finishId: created.id,
          qtyMin: t.qtyMin,
          qtyMax: t.qtyMax,
          pricePerSheet: copyScalar(t.pricePerSheet),
          setupCost: copyScalar(t.setupCost),
        },
      });
    }
  }

  const defaultPackaging = await prisma.packagingOption.findMany({ where: { fournisseurId: null } });
  for (const pkg of defaultPackaging) {
    await prisma.packagingOption.create({
      data: {
        fournisseurId: fid,
        name: pkg.name,
        type: pkg.type,
        costPerUnit: copyScalar(pkg.costPerUnit),
        costPerOrder: copyScalar(pkg.costPerOrder),
        appliesTo: pkg.appliesTo as object,
        active: pkg.active,
      },
    });
  }

  const defaultCarriers = await prisma.carrier.findMany({ where: { fournisseurId: null }, include: { deliveryRates: true } });
  for (const c of defaultCarriers) {
    const created = await prisma.carrier.create({ data: { fournisseurId: fid, name: c.name, active: c.active } });
    for (const r of c.deliveryRates) {
      await prisma.deliveryRate.create({
        data: {
          carrierId: created.id,
          zone: r.zone,
          maxWeightKg: copyScalar(r.maxWeightKg),
          price: copyScalar(r.price),
        },
      });
    }
  }

  const defaultOffsetConfig = await prisma.offsetConfig.findMany({ where: { fournisseurId: null } });
  for (const c of defaultOffsetConfig) {
    await prisma.offsetConfig.create({
      data: { fournisseurId: fid, key: c.key, value: copyScalar(c.value), unit: c.unit ?? undefined, description: c.description ?? undefined },
    });
  }
  const defaultDigitalConfig = await prisma.digitalConfig.findMany({ where: { fournisseurId: null } });
  for (const c of defaultDigitalConfig) {
    await prisma.digitalConfig.create({
      data: { fournisseurId: fid, key: c.key, value: copyScalar(c.value), unit: c.unit ?? undefined, description: c.description ?? undefined },
    });
  }
  const defaultMarginConfig = await prisma.marginConfig.findMany({ where: { fournisseurId: null } });
  for (const c of defaultMarginConfig) {
    await prisma.marginConfig.create({
      data: { fournisseurId: fid, key: c.key, value: copyScalar(c.value), unit: c.unit ?? undefined, description: c.description ?? undefined },
    });
  }

  const defaultMachineFormats = await prisma.machineFormat.findMany({ where: { fournisseurId: null } });
  for (const mf of defaultMachineFormats) {
    await prisma.machineFormat.create({
      data: { fournisseurId: fid, name: mf.name, widthCm: mf.widthCm, heightCm: mf.heightCm, isDefault: mf.isDefault },
    });
  }

  const defaultFormatClickDivisors = await prisma.formatClickDivisor.findMany({ where: { fournisseurId: null } });
  for (const fcd of defaultFormatClickDivisors) {
    await prisma.formatClickDivisor.create({
      data: {
        fournisseurId: fid,
        formatName: fcd.formatName,
        divisorRecto: fcd.divisorRecto,
        divisorRectoVerso: fcd.divisorRectoVerso,
      },
    });
  }
}
