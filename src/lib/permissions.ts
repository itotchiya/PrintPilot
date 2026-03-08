import { Role } from '@/generated/prisma/enums';

/**
 * Permission definitions for the 3-tier role architecture
 * 
 * Roles:
 * - SUPER_ADMIN: Full platform control + can act as Client
 * - ADMIN: Internal platform admin (legacy, kept for internal use)
 * - SUPPLIER: Printing supplier - manages config and invites clients
 * - CLIENT: End user - generates quotes from suppliers
 * 
 * Note: FOURNISSEUR, ACHETEUR, EMPLOYEE are legacy roles being migrated
 */

export const Permissions = {
  // Super Admin only
  INVITE_SUPPLIER: ['SUPER_ADMIN'],
  CONFIGURE_DEFAULTS: ['SUPER_ADMIN'],        // Configure default engine settings
  CONFIGURE_ANY_SUPPLIER: ['SUPER_ADMIN'],    // Edit any supplier's config
  SUSPEND_SUPPLIER: ['SUPER_ADMIN'],
  VIEW_GLOBAL_DASHBOARD: ['SUPER_ADMIN'],     // See all suppliers stats
  MANAGE_SUBSCRIPTIONS: ['SUPER_ADMIN'],
  
  // Supplier capabilities
  INVITE_CLIENT: ['SUPER_ADMIN', 'SUPPLIER'],
  CONFIGURE_OWN_PRICING: ['SUPER_ADMIN', 'SUPPLIER'],
  VIEW_OWN_CLIENTS: ['SUPER_ADMIN', 'SUPPLIER'],
  VIEW_OWN_ACTIVITY: ['SUPER_ADMIN', 'SUPPLIER'],
  MANAGE_BRANDING: ['SUPER_ADMIN', 'SUPPLIER'],
  IMPORT_EXPORT_CONFIG: ['SUPER_ADMIN', 'SUPPLIER'],
  
  // Client capabilities (also available to Super Admin and Supplier when acting as client)
  CREATE_QUOTE: ['SUPER_ADMIN', 'SUPPLIER', 'CLIENT'],
  VIEW_QUOTES: ['SUPER_ADMIN', 'SUPPLIER', 'CLIENT'],
  MULTI_SUPPLIER_QUOTE: ['SUPER_ADMIN', 'SUPPLIER', 'CLIENT'],
  DOWNLOAD_PDF: ['SUPER_ADMIN', 'SUPPLIER', 'CLIENT'],
  VIEW_MY_SUPPLIERS: ['SUPER_ADMIN', 'SUPPLIER', 'CLIENT'],
} as const;

export type Permission = keyof typeof Permissions;

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role | string, permission: Permission): boolean {
  const allowedRoles = Permissions[permission];
  return allowedRoles.includes(role as any);
}

/**
 * Check if user can act as a client (generate quotes, view suppliers)
 * Super Admin, Supplier, and Client can all act as clients
 */
export function canActAsClient(role: Role): boolean {
  return ['SUPER_ADMIN', 'SUPPLIER', 'CLIENT'].includes(role);
}

/**
 * Check if user is a supplier (has supplier profile)
 */
export function isSupplier(role: Role): boolean {
  return role === 'SUPER_ADMIN' || role === 'SUPPLIER' || role === 'FOURNISSEUR';
}

/**
 * Get dashboard route based on role
 */
export function getDashboardRoute(role: Role): string {
  switch (role) {
    case 'SUPER_ADMIN':
      return '/admin/dashboard';
    case 'SUPPLIER':
    case 'FOURNISSEUR':
      return '/supplier/dashboard';
    case 'CLIENT':
    case 'ACHETEUR':
      return '/client/dashboard';
    default:
      return '/dashboard';
  }
}

/**
 * Role display names
 */
export const RoleDisplayNames: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  EMPLOYEE: 'Employee (Legacy)',
  FOURNISSEUR: 'Supplier (Legacy)',
  ACHETEUR: 'Client (Legacy)',
  CLIENT: 'Client',
  SUPPLIER: 'Supplier',
};

/**
 * Role descriptions
 */
export const RoleDescriptions: Record<Role, string> = {
  SUPER_ADMIN: 'Full platform access. Can manage suppliers, configure defaults, and use platform as client.',
  ADMIN: 'Internal platform administrator.',
  EMPLOYEE: 'Legacy role - being migrated.',
  FOURNISSEUR: 'Legacy supplier role - being migrated to SUPPLIER.',
  ACHETEUR: 'Legacy client role - being migrated to CLIENT.',
  CLIENT: 'End user who generates quotes from suppliers.',
  SUPPLIER: 'Printing supplier who configures pricing and invites clients.',
};

/**
 * Migration helper: Map legacy roles to new roles
 */
export function migrateLegacyRole(role: Role): Role {
  switch (role) {
    case 'FOURNISSEUR':
      return 'SUPPLIER';
    case 'ACHETEUR':
      return 'CLIENT';
    case 'EMPLOYEE':
      return 'CLIENT'; // Employees become clients or can be promoted
    default:
      return role;
  }
}

/**
 * Permission check for API routes
 * Returns 403 response if permission denied
 */
export function checkPermission(
  role: Role | string | undefined | null,
  permission: Permission
): { allowed: true } | { allowed: false; reason: string } {
  if (!role) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  if (!hasPermission(role as Role, permission)) {
    return { 
      allowed: false, 
      reason: `Role '${role}' does not have permission '${permission}'` 
    };
  }

  return { allowed: true };
}
