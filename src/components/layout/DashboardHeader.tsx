"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserMenu } from "./UserMenu";
import { Printer, FileText, PlusCircle } from "lucide-react";

const navLinks = [
  { label: "Mes devis", href: "/quotes", icon: FileText },
  { label: "Nouveau devis", href: "/dashboard/new", icon: PlusCircle },
];

export function DashboardHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b border-border bg-background/80 px-4 backdrop-blur md:px-6">
      <Link href="/" className="mr-6 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
          <Printer className="h-4 w-4 text-primary" />
        </div>
        <span className="text-base font-semibold tracking-tight">
          PrintPilot
        </span>
      </Link>

      <nav className="flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              <link.icon className="h-3.5 w-3.5" />
              {link.label}
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
