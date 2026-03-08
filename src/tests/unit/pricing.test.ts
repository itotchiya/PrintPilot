import { describe, it, expect, vi, beforeEach } from 'vitest';
import { calculateQuoteForSupplier, getSuppliersWithPricing } from '@/lib/pricing/multi-supplier';
import { prisma } from '@/lib/prisma';

describe('Multi-Supplier Pricing Engine', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('calculateQuoteForSupplier', () => {
    const mockSpecs = {
      productType: 'BROCHURE',
      quantity: 100,
      format: 'A4',
      pages: 4,
      colorMode: '4/4',
      binding: 'Stapled',
      lamination: 'None',
    };

    it('should calculate quote with valid supplier config', async () => {
      const mockSupplier = {
        id: 'sup_123',
        companyName: 'Test Supplier',
        primaryColor: '#3B8BEB',
      };

      const mockPaperTypes = [
        {
          id: 'paper_1',
          active: true,
          grammages: [
            {
              pricePerKg: 2.5,
              weightPer1000Sheets: 5,
            },
          ],
        },
      ];

      const mockBindingTypes = [
        {
          id: 'bind_1',
          name: 'stapled',
          digitalPriceTiers: [
            {
              perUnitCost: 0.5,
            },
          ],
        },
      ];

      const mockLaminationModes: unknown[] = [];

      vi.mocked(prisma.supplierProfile.findUnique).mockResolvedValue(mockSupplier as any);
      vi.mocked(prisma.paperType.findMany).mockResolvedValue(mockPaperTypes as any);
      vi.mocked(prisma.bindingType.findMany).mockResolvedValue(mockBindingTypes as any);
      vi.mocked(prisma.laminationMode.findMany).mockResolvedValue(mockLaminationModes as any);

      const result = await calculateQuoteForSupplier('sup_123', mockSpecs);

      expect(result.totalPrice).toBeGreaterThan(0);
      expect(result.unitPrice).toBeGreaterThan(0);
      expect(result.breakdown).toBeInstanceOf(Array);
      expect(result.turnaround).toBeDefined();
    });

    it('should apply volume discounts for large quantities', async () => {
      const mockSupplier = {
        id: 'sup_123',
        companyName: 'Test Supplier',
      };

      const largeSpecs = {
        ...mockSpecs,
        quantity: 1000,
      };

      const mockPaperTypes = [
        {
          id: 'paper_1',
          active: true,
          grammages: [{ pricePerKg: 2.5, weightPer1000Sheets: 5 }],
        },
      ];

      vi.mocked(prisma.supplierProfile.findUnique).mockResolvedValue(mockSupplier as any);
      vi.mocked(prisma.paperType.findMany).mockResolvedValue(mockPaperTypes as any);
      vi.mocked(prisma.bindingType.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.laminationMode.findMany).mockResolvedValue([] as any);

      const result = await calculateQuoteForSupplier('sup_123', largeSpecs);

      // Should have volume discount in breakdown
      const hasDiscount = result.breakdown.some(
        (item) => item.label.includes('Discount') && item.amount < 0
      );
      expect(hasDiscount).toBe(true);
    });

    it('should throw error for non-existent supplier', async () => {
      vi.mocked(prisma.supplierProfile.findUnique).mockResolvedValue(null);

      await expect(calculateQuoteForSupplier('invalid_id', mockSpecs)).rejects.toThrow(
        'Supplier not found'
      );
    });

    it('should handle color mode multipliers', async () => {
      const mockSupplier = {
        id: 'sup_123',
        companyName: 'Test Supplier',
      };

      const bwSpecs = {
        ...mockSpecs,
        colorMode: '1/1',
      };

      const mockPaperTypes = [
        {
          id: 'paper_1',
          active: true,
          grammages: [{ pricePerKg: 2.5, weightPer1000Sheets: 5 }],
        },
      ];

      vi.mocked(prisma.supplierProfile.findUnique).mockResolvedValue(mockSupplier as any);
      vi.mocked(prisma.paperType.findMany).mockResolvedValue(mockPaperTypes as any);
      vi.mocked(prisma.bindingType.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.laminationMode.findMany).mockResolvedValue([] as any);

      const result = await calculateQuoteForSupplier('sup_123', bwSpecs);

      expect(result.totalPrice).toBeGreaterThan(0);
    });

    it('should calculate turnaround based on quantity', async () => {
      const mockSupplier = {
        id: 'sup_123',
        companyName: 'Test Supplier',
      };

      const mockPaperTypes = [
        {
          id: 'paper_1',
          active: true,
          grammages: [{ pricePerKg: 2.5, weightPer1000Sheets: 5 }],
        },
      ];

      vi.mocked(prisma.supplierProfile.findUnique).mockResolvedValue(mockSupplier as any);
      vi.mocked(prisma.paperType.findMany).mockResolvedValue(mockPaperTypes as any);
      vi.mocked(prisma.bindingType.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.laminationMode.findMany).mockResolvedValue([] as any);

      const smallResult = await calculateQuoteForSupplier('sup_123', { ...mockSpecs, quantity: 100 });
      const largeResult = await calculateQuoteForSupplier('sup_123', { ...mockSpecs, quantity: 1500 });

      expect(smallResult.turnaround).toBe('2-3 business days');
      expect(largeResult.turnaround).toBe('5-7 business days');
    });
  });

  describe('getSuppliersWithPricing', () => {
    const mockSpecs = {
      productType: 'BROCHURE',
      quantity: 100,
      format: 'A4',
      pages: 4,
      colorMode: '4/4',
    };

    it('should return pricing for multiple suppliers', async () => {
      const mockSuppliers = [
        { id: 'sup_1', companyName: 'Supplier 1', logoUrl: null, primaryColor: '#000' },
        { id: 'sup_2', companyName: 'Supplier 2', logoUrl: null, primaryColor: '#fff' },
      ];

      vi.mocked(prisma.supplierProfile.findUnique)
        .mockResolvedValueOnce(mockSuppliers[0] as any)
        .mockResolvedValueOnce(mockSuppliers[1] as any);

      vi.mocked(prisma.paperType.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.bindingType.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.laminationMode.findMany).mockResolvedValue([] as any);

      const results = await getSuppliersWithPricing(['sup_1', 'sup_2'], mockSpecs);

      expect(results).toHaveLength(2);
      expect(results[0].companyName).toBe('Supplier 1');
      expect(results[1].companyName).toBe('Supplier 2');
      expect(results[0].quote).toBeDefined();
      expect(results[1].quote).toBeDefined();
    });

    it('should filter out invalid supplier IDs', async () => {
      vi.mocked(prisma.supplierProfile.findUnique)
        .mockResolvedValueOnce({ id: 'sup_1', companyName: 'Supplier 1', logoUrl: null, primaryColor: '#000' } as any)
        .mockResolvedValueOnce(null);

      vi.mocked(prisma.paperType.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.bindingType.findMany).mockResolvedValue([] as any);
      vi.mocked(prisma.laminationMode.findMany).mockResolvedValue([] as any);

      const results = await getSuppliersWithPricing(['sup_1', 'invalid'], mockSpecs);

      expect(results).toHaveLength(1);
      expect(results[0].supplierId).toBe('sup_1');
    });
  });
});
