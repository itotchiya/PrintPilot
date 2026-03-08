import { type NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "E-mail", type: "email" },
        password: { label: "Mot de passe", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Identifiants invalides");
        }

        const email = credentials.email.trim().toLowerCase();
        
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            supplierProfile: true,
          },
        });

        if (!user) {
          throw new Error("Identifiants invalides");
        }

        const isValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isValid) {
          throw new Error("Identifiants invalides");
        }

        // Check if supplier account is suspended
        if (user.supplierProfile && !user.supplierProfile.isActive && user.supplierProfile.subscriptionStatus === 'SUSPENDED') {
          throw new Error("Votre compte fournisseur a été suspendu. Veuillez contacter l'administrateur.");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          supplierProfile: user.supplierProfile
            ? {
                id: user.supplierProfile.id,
                companyName: user.supplierProfile.companyName,
                isActive: user.supplierProfile.isActive,
                onboardingStep: user.supplierProfile.onboardingStep,
                subscriptionStatus: user.supplierProfile.subscriptionStatus,
                usesDefaultConfig: user.supplierProfile.usesDefaultConfig,
              }
            : null,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.supplierProfile = (user as { supplierProfile: any }).supplierProfile;
      }

      // Handle session update
      if (trigger === "update" && session) {
        token.name = session.name;
        // Update supplier profile if provided
        if (session.supplierProfile) {
          token.supplierProfile = {
            ...token.supplierProfile,
            ...session.supplierProfile,
          };
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.id as string;
        (session.user as { role: string }).role = token.role as string;
        (session.user as { supplierProfile: any }).supplierProfile = token.supplierProfile;
      }
      return session;
    },
  },
};

// Extended types for NextAuth
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      role: string;
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
    role: string;
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
    role?: string;
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
