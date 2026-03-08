"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import {
  Printer,
  FileText,
  PlusCircle,
  LayoutDashboard,
  ClipboardList,
  Shield,
  Building2,
  User,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type NavLink = { label: string; href: string; icon: React.ElementType };

// Client navigation links
const clientLinks: NavLink[] = [
  { label: "Dashboard", href: "/client/dashboard", icon: LayoutDashboard },
  { label: "My Quotes", href: "/client/quotes", icon: FileText },
  { label: "New Quote", href: "/client/quotes/new", icon: PlusCircle },
];

// Supplier navigation links
const supplierLinks: NavLink[] = [
  { label: "Dashboard", href: "/supplier/dashboard", icon: LayoutDashboard },
  { label: "My Clients", href: "/supplier/clients", icon: ClipboardList },
  { label: "New Quote", href: "/dashboard/new", icon: PlusCircle },
];

// Super Admin navigation links
const superAdminLinks: NavLink[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Suppliers", href: "/admin/suppliers", icon: Building2 },
  { label: "Quotes", href: "/admin/quotes", icon: ClipboardList },
];

// Legacy navigation links (for backward compatibility)
const legacyClientLinks: NavLink[] = [
  { label: "My Quotes", href: "/quotes", icon: FileText },
  { label: "New Quote", href: "/dashboard/new", icon: PlusCircle },
];

// Role badge styling
const roleBadge: Record<string, { label: string; className: string }> = {
  SUPER_ADMIN: {
    label: "Super Admin",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
  SUPPLIER: {
    label: "Supplier",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
  CLIENT: {
    label: "Client",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
  // Legacy mappings
  ADMIN: {
    label: "Admin",
    className:
      "bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
  EMPLOYEE: {
    label: "Employee",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
  FOURNISSEUR: {
    label: "Supplier",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
  ACHETEUR: {
    label: "Client",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
};

export function DashboardHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "CLIENT";

  // Determine navigation links based on role
  let navLinks = clientLinks;
  let homeHref = "/client/dashboard";
  let LogoIcon = User;

  if (role === "SUPER_ADMIN") {
    navLinks = superAdminLinks;
    homeHref = "/admin/dashboard";
    LogoIcon = Shield;
  } else if (role === "SUPPLIER" || role === "FOURNISSEUR") {
    navLinks = supplierLinks;
    homeHref = "/supplier/dashboard";
    LogoIcon = Building2;
  } else if (role === "CLIENT" || role === "ACHETEUR") {
    navLinks = clientLinks;
    homeHref = "/client/dashboard";
    LogoIcon = User;
  } else if (role === "ADMIN" || role === "EMPLOYEE") {
    // Legacy support
    navLinks = legacyClientLinks;
    homeHref = "/dashboard";
    LogoIcon = Printer;
  }

  const badge = roleBadge[role];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Logo */}
      <Link href={homeHref} className="mr-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <LogoIcon className="h-4 w-4 text-primary" />
        </div>
        <span className="text-base font-semibold tracking-tight">PrintQuote</span>
        {badge && (
          <Badge variant="outline" className={cn(badge.className, "hidden sm:inline-flex")}>
            {badge.label}
          </Badge>
        )}
      </Link>

      {/* Nav links */}
      <nav className="flex items-center gap-0.5 overflow-x-auto">
        {navLinks.map((link) => {
          const isActive =
            link.href === homeHref
              ? pathname === link.href
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <link.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto">
        <UserMenu />
      </div>
    </header>
  );
}
