import { Role, SupplierProfile } from '@/generated/prisma';

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: Role;
      supplierProfile: {
        id: string;
        companyName: string;
        isActive: boolean;
        onboardingStep: string;
        subscriptionStatus: string;
        usesDefaultConfig: boolean;
      } | null;
    };
  }

  interface User {
    id: string;
    role: Role;
    supplierProfile: {
      id: string;
      companyName: string;
      isActive: boolean;
      onboardingStep: string;
      subscriptionStatus: string;
      usesDefaultConfig: boolean;
    } | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    supplierProfile?: {
      id: string;
      companyName: string;
      isActive: boolean;
      onboardingStep: string;
      subscriptionStatus: string;
      usesDefaultConfig: boolean;
    } | null;
  }
}
