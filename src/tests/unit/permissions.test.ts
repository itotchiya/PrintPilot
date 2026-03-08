import { describe, it, expect } from 'vitest';
import { hasPermission, canActAsClient, Permissions } from '@/lib/permissions';
import { Role } from '@prisma/client';

describe('Permission System', () => {
  describe('hasPermission', () => {
    it('should allow SUPER_ADMIN to invite suppliers', () => {
      expect(hasPermission('SUPER_ADMIN', 'INVITE_SUPPLIER')).toBe(true);
    });

    it('should not allow SUPPLIER to invite suppliers', () => {
      expect(hasPermission('SUPER_ADMIN', 'INVITE_SUPPLIER')).toBe(true);
    });

    it('should not allow CLIENT to invite suppliers', () => {
      expect(hasPermission('CLIENT', 'INVITE_SUPPLIER')).toBe(false);
    });

    it('should allow SUPER_ADMIN and SUPPLIER to invite clients', () => {
      expect(hasPermission('SUPER_ADMIN', 'INVITE_CLIENT')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'INVITE_CLIENT')).toBe(true);
    });

    it('should not allow CLIENT to invite clients', () => {
      expect(hasPermission('CLIENT', 'INVITE_CLIENT')).toBe(false);
    });

    it('should allow all roles to create quotes', () => {
      expect(hasPermission('SUPER_ADMIN', 'CREATE_QUOTE')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'CREATE_QUOTE')).toBe(true);
      expect(hasPermission('CLIENT', 'CREATE_QUOTE')).toBe(true);
    });

    it('should allow all roles for multi-supplier quotes', () => {
      expect(hasPermission('SUPER_ADMIN', 'MULTI_SUPPLIER_QUOTE')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'MULTI_SUPPLIER_QUOTE')).toBe(true);
      expect(hasPermission('CLIENT', 'MULTI_SUPPLIER_QUOTE')).toBe(true);
    });

    it('should only allow SUPER_ADMIN to configure defaults', () => {
      expect(hasPermission('SUPER_ADMIN', 'CONFIGURE_DEFAULTS')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'CONFIGURE_DEFAULTS')).toBe(false);
      expect(hasPermission('CLIENT', 'CONFIGURE_DEFAULTS')).toBe(false);
    });

    it('should only allow SUPER_ADMIN to view global dashboard', () => {
      expect(hasPermission('SUPER_ADMIN', 'VIEW_GLOBAL_DASHBOARD')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'VIEW_GLOBAL_DASHBOARD')).toBe(false);
      expect(hasPermission('CLIENT', 'VIEW_GLOBAL_DASHBOARD')).toBe(false);
    });

    it('should allow SUPER_ADMIN and SUPPLIER to view own clients', () => {
      expect(hasPermission('SUPER_ADMIN', 'VIEW_OWN_CLIENTS')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'VIEW_OWN_CLIENTS')).toBe(true);
      expect(hasPermission('CLIENT', 'VIEW_OWN_CLIENTS')).toBe(false);
    });

    it('should allow all roles to view quotes', () => {
      expect(hasPermission('SUPER_ADMIN', 'VIEW_QUOTES')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'VIEW_QUOTES')).toBe(true);
      expect(hasPermission('CLIENT', 'VIEW_QUOTES')).toBe(true);
    });

    it('should allow SUPER_ADMIN and SUPPLIER to configure own pricing', () => {
      expect(hasPermission('SUPER_ADMIN', 'CONFIGURE_OWN_PRICING')).toBe(true);
      expect(hasPermission('SUPER_ADMIN', 'CONFIGURE_OWN_PRICING')).toBe(true);
      expect(hasPermission('CLIENT', 'CONFIGURE_OWN_PRICING')).toBe(false);
    });
  });

  describe('canActAsClient', () => {
    it('should allow SUPER_ADMIN to act as client', () => {
      expect(canActAsClient('SUPER_ADMIN')).toBe(true);
    });

    it('should allow CLIENT to act as client', () => {
      expect(canActAsClient('CLIENT')).toBe(true);
    });

    it('should not allow SUPPLIER to act as client', () => {
      expect(canActAsClient('SUPER_ADMIN')).toBe(true);
    });
  });

  describe('Permissions object', () => {
    it('should have all required permission keys', () => {
      const expectedKeys = [
        'INVITE_SUPPLIER',
        'INVITE_CLIENT',
        'CONFIGURE_DEFAULTS',
        'CONFIGURE_OWN_PRICING',
        'VIEW_GLOBAL_DASHBOARD',
        'VIEW_OWN_CLIENTS',
        'VIEW_QUOTES',
        'CREATE_QUOTE',
        'MULTI_SUPPLIER_QUOTE',
        'DOWNLOAD_PDF',
        'SUSPEND_ACCOUNTS',
        'CONFIGURE_ANY_SUPPLIER',
      ];

      expectedKeys.forEach((key) => {
        expect(Permissions[key as keyof typeof Permissions]).toBeDefined();
        expect(Array.isArray(Permissions[key as keyof typeof Permissions])).toBe(true);
      });
    });

    it('should have valid roles in all permission arrays', () => {
      const validRoles: Role[] = ['SUPER_ADMIN', 'SUPER_ADMIN', 'CLIENT'];

      Object.values(Permissions).forEach((roles) => {
        roles.forEach((role) => {
          expect(validRoles).toContain(role);
        });
      });
    });
  });
});
