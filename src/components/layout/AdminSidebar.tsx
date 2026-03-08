"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/Logo";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Calculator,
  FileText,
  PlusCircle,
  Palette,
  Ruler,
  Paintbrush,
  Scissors,
  Layers,
  Package,
  Truck,
  Settings,
  Cpu,
  Percent,
  Printer,
  Menu,
  LogOut,
  ChevronUp,
  Sun,
  Moon,
  Monitor,
  Users,
  ShieldCheck,
  Building2,
} from "lucide-react";

// ─── Navigation structure ─────────────────────────────────────────────────────

// Navigation Super Admin
const topLinksSuperAdmin = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Fournisseurs", href: "/admin/suppliers", icon: Building2 },
  { label: "Configuration", href: "/admin/config", icon: Calculator, exact: true },
  { label: "Utilisateurs", href: "/admin/users", icon: Users },
  { label: "Permissions", href: "/admin/permissions", icon: ShieldCheck },
];

// Navigation Fournisseur
const topLinksSupplier = [
  { label: "Tableau de bord", href: "/supplier/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Mes clients", href: "/supplier/clients", icon: Users },
  { label: "Devis", href: "/supplier/quotes", icon: FileText, exact: true },
  { label: "Configuration", href: "/supplier/config", icon: Calculator, exact: true },
  { label: "Marque", href: "/supplier/branding", icon: Palette },
];

// Liens création de devis — Fournisseur
const quoteLinksSupplier = [
  { label: "Nouveau devis", href: "/supplier/quotes/new", icon: PlusCircle, exact: true },
  { label: "Numérique", href: "/supplier/quotes/new-digital", icon: Cpu, exact: true },
  { label: "Offset", href: "/supplier/quotes/new-offset", icon: Printer, exact: true },
];

// Engine configuration links for Supplier
const engineLinksSupplier = [
  { label: "Papers", href: "/supplier/config/paper", icon: FileText },
  { label: "Formats", href: "/supplier/config/formats", icon: Ruler },
  { label: "Colors", href: "/supplier/config/colors", icon: Palette },
  { label: "Finishing", href: "/supplier/config/finishing", icon: Paintbrush },
  { label: "Folds", href: "/supplier/config/folds", icon: Scissors },
  { label: "Lamination", href: "/supplier/config/lamination", icon: Layers },
  { label: "Packaging", href: "/supplier/config/packaging", icon: Package },
  { label: "Delivery", href: "/supplier/config/delivery", icon: Truck },
  { label: "Offset Costs", href: "/supplier/config/offset", icon: Settings },
  { label: "Digital Costs", href: "/supplier/config/digital", icon: Cpu },
  { label: "Margins", href: "/supplier/config/margins", icon: Percent },
];

// Navigation Client
const topLinksClient = [
  { label: "Tableau de bord", href: "/client/dashboard", icon: LayoutDashboard, exact: true },
  { label: "Mes devis", href: "/client/quotes", icon: FileText, badge: true },
  { label: "Mes fournisseurs", href: "/client/suppliers", icon: Building2 },
];

// Liens création de devis — Client
const quoteLinksClient = [
  { label: "Nouveau devis", href: "/client/quotes/new", icon: PlusCircle, exact: true },
  { label: "Numérique", href: "/client/quotes/new-digital", icon: Cpu, exact: true },
  { label: "Offset", href: "/client/quotes/new-offset", icon: Printer, exact: true },
];

// Engine configuration links (for Super Admin only)
const engineLinksSuperAdmin = [
  { label: "Papers", href: "/admin/config/paper", icon: FileText },
  { label: "Formats", href: "/admin/config/formats", icon: Ruler },
  { label: "Colors", href: "/admin/config/colors", icon: Palette },
  { label: "Finishing", href: "/admin/config/finishing", icon: Paintbrush },
  { label: "Folds", href: "/admin/config/folds", icon: Scissors },
  { label: "Lamination", href: "/admin/config/lamination", icon: Layers },
  { label: "Packaging", href: "/admin/config/packaging", icon: Package },
  { label: "Delivery", href: "/admin/config/delivery", icon: Truck },
  { label: "Offset Costs", href: "/admin/config/offset", icon: Settings },
  { label: "Digital Costs", href: "/admin/config/digital", icon: Cpu },
  { label: "Margins", href: "/admin/config/margins", icon: Percent },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function SidebarLogo({ role }: { role?: string }) {
  // Determine home href based on role
  let href = "/dashboard";
  if (role === "SUPER_ADMIN") href = "/admin";
  else if (role === "SUPPLIER" || role === "FOURNISSEUR") href = "/supplier/dashboard";
  else if (role === "CLIENT" || role === "ACHETEUR") href = "/client/dashboard";
  
  return (
    <Link
      href={href}
      className="flex h-14 shrink-0 items-center border-b border-border px-5"
      aria-label="PrintQuote"
    >
      <Logo className="h-6 w-auto max-w-[148px]" />
    </Link>
  );
}

// ─── Nav content ──────────────────────────────────────────────────────────────

function NavLink({
  href,
  icon: Icon,
  label,
  active,
  onClick,
  badge,
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
  badge?: number | null;
}) {
  return (
    <li>
      <Link
        href={href}
        onClick={onClick}
        className={cn(
          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
          active
            ? "bg-primary/10 font-medium text-primary"
            : "text-muted-foreground hover:bg-accent hover:text-foreground"
        )}
      >
        <Icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 truncate">{label}</span>
        {badge != null && (
          <span className="shrink-0 rounded-full bg-muted-foreground/20 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </Link>
    </li>
  );
}

function SidebarNav({
  pathname,
  onNavigate,
  role,
}: {
  pathname: string;
  onNavigate?: () => void;
  role?: string;
}) {
  const [quotesCount, setQuotesCount] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/quotes?limit=1")
      .then((res) => res.ok ? res.json() : null)
      .then((data: { total?: number } | null) => {
        if (data && typeof data.total === "number") setQuotesCount(data.total);
      })
      .catch(() => {});
  }, []);

  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  // Determine navigation based on role
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isSupplier = role === "SUPPLIER" || role === "FOURNISSEUR";

  let topLinks = topLinksClient;
  let engineLinks: typeof engineLinksSuperAdmin = [];
  let quoteLinks: typeof quoteLinksSupplier = [];

  if (isSuperAdmin) {
    topLinks = topLinksSuperAdmin;
    engineLinks = engineLinksSuperAdmin;
  } else if (isSupplier) {
    topLinks = topLinksSupplier;
    engineLinks = engineLinksSupplier;
    quoteLinks = quoteLinksSupplier;
  } else {
    quoteLinks = quoteLinksClient;
  }

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {/* Main Navigation */}
      <div>
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          {isSuperAdmin ? "Administration" : isSupplier ? "Gestion" : "Navigation"}
        </p>
        <ul className="space-y-0.5">
          {topLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              active={isActive(link.href, Boolean("exact" in link && link.exact))}
              onClick={onNavigate}
              badge={"badge" in link && link.badge ? quotesCount : undefined}
            />
          ))}
        </ul>
      </div>

      {/* New Devis Section */}
      {quoteLinks.length > 0 && (
        <div>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Nouveau Devis
          </p>
          <ul className="space-y-0.5">
            {quoteLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                active={isActive(link.href)}
                onClick={onNavigate}
              />
            ))}
          </ul>
        </div>
      )}

      {/* Engine Configuration */}
      {engineLinks.length > 0 && (
        <div>
          <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
            Configuration
          </p>
          <ul className="space-y-0.5">
            {engineLinks.map((link) => (
              <NavLink
                key={link.href}
                href={link.href}
                icon={link.icon}
                label={link.label}
                active={isActive(link.href)}
                onClick={onNavigate}
              />
            ))}
          </ul>
        </div>
      )}
    </nav>
  );
}

// ─── Profile footer ───────────────────────────────────────────────────────────

function SidebarProfile() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  if (!session?.user) return null;

  const name = session.user.name ?? "User";
  const email = session.user.email ?? "";
  const role = (session.user as { role?: string }).role ?? "CLIENT";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Updated role labels for 3-tier system
  const roleLabel: Record<string, string> = {
    SUPER_ADMIN: "Super Admin",
    SUPPLIER: "Supplier",
    CLIENT: "Client",
    // Legacy role mappings
    ADMIN: "Administrator",
    EMPLOYEE: "Employee",
    FOURNISSEUR: "Supplier",
    ACHETEUR: "Client",
  };

  // Determine dashboard link based on role
  let dashboardHref = "/dashboard";
  if (role === "SUPER_ADMIN") dashboardHref = "/admin";
  else if (role === "SUPPLIER" || role === "FOURNISSEUR") dashboardHref = "/supplier/dashboard";
  else if (role === "CLIENT" || role === "ACHETEUR") dashboardHref = "/client/dashboard";

  return (
    <div className="shrink-0 border-t border-border px-3 py-3">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-accent">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-medium leading-none">{name}</p>
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {roleLabel[role] ?? role}
              </p>
            </div>
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
          <DropdownMenuLabel className="font-normal">
            <p className="font-medium">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Theme</p>
            <div className="flex gap-1">
              <button
                onClick={() => setTheme("light")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                  theme === "light"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                )}
              >
                <Sun className="h-3.5 w-3.5" />
                Light
              </button>
              <button
                onClick={() => setTheme("dark")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                  theme === "dark"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                )}
              >
                <Moon className="h-3.5 w-3.5" />
                Dark
              </button>
              <button
                onClick={() => setTheme("system")}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                  theme === "system"
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-accent"
                )}
              >
                <Monitor className="h-3.5 w-3.5" />
                Auto
              </button>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href={dashboardHref} className="cursor-pointer">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { data: session } = useSession();
  const role = (session?.user as { role?: string } | undefined)?.role;

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <SidebarLogo role={role} />
      <SidebarNav pathname={pathname} onNavigate={() => setIsOpen(false)} role={role} />
      <SidebarProfile />
    </div>
  );

  return (
    <>
      {/* Desktop sidebar — fixed height, scrollable nav */}
      <aside className="hidden md:flex h-screen w-60 shrink-0 sticky top-0 flex-col border-r border-border bg-background">
        {sidebarContent}
      </aside>

      {/* Mobile — FAB + Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          <button
            className="md:hidden fixed bottom-4 right-4 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        </SheetTrigger>
        <SheetContent side="left" className="w-60 p-0 flex flex-col">
          {sidebarContent}
        </SheetContent>
      </Sheet>
    </>
  );
}
