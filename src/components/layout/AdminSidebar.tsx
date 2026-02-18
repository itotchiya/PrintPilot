"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
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
  Calculator,
  BarChart3,
  Percent,
  Menu,
} from "lucide-react";

const configLinks = [
  {
    label: "Vue d'ensemble",
    href: "/admin/config",
    icon: BarChart3,
  },
  {
    label: "Papiers",
    href: "/admin/config/paper",
    icon: FileText,
  },
  {
    label: "Formats",
    href: "/admin/config/formats",
    icon: Ruler,
  },
  {
    label: "Couleurs d'impression",
    href: "/admin/config/colors",
    icon: Palette,
  },
  {
    label: "Façonnage",
    href: "/admin/config/finishing",
    icon: Paintbrush,
  },
  {
    label: "Plis",
    href: "/admin/config/folds",
    icon: Scissors,
  },
  {
    label: "Pelliculage",
    href: "/admin/config/lamination",
    icon: Layers,
  },
  {
    label: "Conditionnement",
    href: "/admin/config/packaging",
    icon: Package,
  },
  {
    label: "Livraison",
    href: "/admin/config/delivery",
    icon: Truck,
  },
  {
    label: "Coûts Offset",
    href: "/admin/config/offset",
    icon: Settings,
  },
  {
    label: "Coûts Numérique",
    href: "/admin/config/digital",
    icon: Cpu,
  },
  {
    label: "Marges",
    href: "/admin/config/margins",
    icon: Percent,
  },
];

const managementLinks = [
  {
    label: "Tous les devis",
    href: "/admin/quotes",
    icon: Calculator,
  },
];

function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-3 py-4">
      <div className="mb-4">
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Moteur de calcul
        </p>
        <ul className="space-y-0.5">
          {configLinks.map((link) => {
            const isActive =
              pathname === link.href ||
              (link.href !== "/admin/config" && pathname.startsWith(link.href));
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div>
        <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Gestion
        </p>
        <ul className="space-y-0.5">
          {managementLinks.map((link) => {
            const isActive = pathname.startsWith(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <link.icon className="h-4 w-4 shrink-0" />
                  {link.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}

export function AdminSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const header = (
    <div className="flex h-14 items-center border-b border-border px-4">
      <Link href="/admin/config" className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Settings className="h-4 w-4 text-primary" />
        </div>
        <span className="text-sm font-semibold tracking-tight">Configuration</span>
      </Link>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex h-full w-60 shrink-0 flex-col border-r border-border bg-background">
        {header}
        <SidebarNav pathname={pathname} />
      </aside>

      {/* Mobile: floating menu button + Sheet */}
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
          {header}
          <SidebarNav pathname={pathname} onNavigate={() => setIsOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
