"use client";

import { useState } from "react";
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
  BarChart3,
  Calculator,
  FileText,
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
  Menu,
  LogOut,
  ChevronUp,
  Sun,
  Moon,
  Monitor,
} from "lucide-react";

// ─── Navigation structure ─────────────────────────────────────────────────────

const topLinks = [
  { label: "Tableau de bord", href: "/admin", icon: LayoutDashboard, exact: true },
  { label: "Vue d'ensemble", href: "/admin/config", icon: BarChart3, exact: true },
  { label: "Devis clients", href: "/admin/quotes", icon: Calculator },
  { label: "Mes devis", href: "/quotes", icon: FileText },
];

const engineLinks = [
  { label: "Papiers", href: "/admin/config/paper", icon: FileText },
  { label: "Formats", href: "/admin/config/formats", icon: Ruler },
  { label: "Couleurs d'impression", href: "/admin/config/colors", icon: Palette },
  { label: "Façonnage", href: "/admin/config/finishing", icon: Paintbrush },
  { label: "Plis", href: "/admin/config/folds", icon: Scissors },
  { label: "Pelliculage", href: "/admin/config/lamination", icon: Layers },
  { label: "Conditionnement", href: "/admin/config/packaging", icon: Package },
  { label: "Livraison", href: "/admin/config/delivery", icon: Truck },
  { label: "Coûts Offset", href: "/admin/config/offset", icon: Settings },
  { label: "Coûts Numérique", href: "/admin/config/digital", icon: Cpu },
  { label: "Marges", href: "/admin/config/margins", icon: Percent },
];

// ─── Logo ─────────────────────────────────────────────────────────────────────

function SidebarLogo() {
  return (
    <Link
      href="/admin"
      className="flex h-14 shrink-0 items-center border-b border-border px-5"
      aria-label="PrintPilot"
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
}: {
  href: string;
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick?: () => void;
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
        {label}
      </Link>
    </li>
  );
}

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const isActive = (href: string, exact = false) =>
    exact ? pathname === href : pathname.startsWith(href);

  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
      {/* Top group — Gestion */}
      <div>
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Gestion
        </p>
        <ul className="space-y-0.5">
          {topLinks.map((link) => (
            <NavLink
              key={link.href}
              href={link.href}
              icon={link.icon}
              label={link.label}
              active={isActive(link.href, link.exact)}
              onClick={onNavigate}
            />
          ))}
        </ul>
      </div>

      {/* Bottom group — Moteur de calcul */}
      <div>
        <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
          Moteur de calcul
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
    </nav>
  );
}

// ─── Profile footer ───────────────────────────────────────────────────────────

function SidebarProfile() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  if (!session?.user) return null;

  const name = session.user.name ?? "Utilisateur";
  const email = session.user.email ?? "";
  const role = (session.user as { role?: string }).role ?? "CLIENT";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const roleLabel: Record<string, string> = {
    ADMIN: "Administrateur",
    EMPLOYEE: "Employé",
    CLIENT: "Client",
  };

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
            <p className="mb-1.5 text-xs font-medium text-muted-foreground">Thème</p>
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
                Clair
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
                Sombre
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
            <Link href="/quotes" className="cursor-pointer">
              <FileText className="mr-2 h-4 w-4" />
              Mes devis
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => signOut({ callbackUrl: "/" })}
            className="cursor-pointer text-destructive focus:text-destructive"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Se déconnecter
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

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <SidebarLogo />
      <SidebarNav pathname={pathname} onNavigate={() => setIsOpen(false)} />
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
            aria-label="Ouvrir le menu"
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
