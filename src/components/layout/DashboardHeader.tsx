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
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

type NavLink = { label: string; href: string; icon: React.ElementType };

const clientLinks: NavLink[] = [
  { label: "Mes devis", href: "/quotes", icon: FileText },
  { label: "Nouveau devis", href: "/dashboard/new", icon: PlusCircle },
];

const employeeLinks: NavLink[] = [
  { label: "Tous les devis", href: "/admin/quotes", icon: ClipboardList },
  { label: "Mes devis", href: "/quotes", icon: FileText },
  { label: "Nouveau devis", href: "/dashboard/new", icon: PlusCircle },
];

const adminLinks: NavLink[] = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard },
  { label: "Devis clients", href: "/admin/quotes", icon: ClipboardList },
  { label: "Mes devis", href: "/quotes", icon: FileText },
  { label: "Nouveau devis", href: "/dashboard/new", icon: PlusCircle },
];

const roleBadge: Record<string, { label: string; className: string }> = {
  ADMIN: {
    label: "Admin",
    className:
      "bg-primary/10 text-primary border-primary/20 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
  EMPLOYEE: {
    label: "Employé",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 text-[10px] font-semibold px-1.5 py-0 h-4",
  },
};

export function DashboardHeader() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role ?? "CLIENT";

  const navLinks =
    role === "ADMIN" ? adminLinks : role === "EMPLOYEE" ? employeeLinks : clientLinks;

  const badge = roleBadge[role];

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      {/* Logo */}
      <Link href={role === "ADMIN" ? "/admin" : "/dashboard"} className="mr-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          {role === "ADMIN" ? (
            <Shield className="h-4 w-4 text-primary" />
          ) : (
            <Printer className="h-4 w-4 text-primary" />
          )}
        </div>
        <span className="text-base font-semibold tracking-tight">PrintPilot</span>
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
            link.href === "/admin"
              ? pathname === "/admin"
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
