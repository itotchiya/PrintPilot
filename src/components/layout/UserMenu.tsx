"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Shield, Sun, Moon, Monitor, Building2 } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

// Updated role labels for 3-tier system
const roleLabels: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  SUPPLIER: "Supplier",
  CLIENT: "Client",
  // Legacy mappings
  ADMIN: "Administrator",
  EMPLOYEE: "Employee",
  FOURNISSEUR: "Supplier",
  ACHETEUR: "Client",
};

export function UserMenu() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  if (!session?.user) return null;

  const initials = session.user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) ?? "U";

  const role = session.user.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isSupplier = role === "SUPPLIER" || role === "FOURNISSEUR";
  const isClient = role === "CLIENT" || role === "ACHETEUR";

  // Determine dashboard link based on role
  let dashboardHref = "/dashboard";
  let dashboardLabel = "Dashboard";
  let DashboardIcon = User;

  if (isSuperAdmin) {
    dashboardHref = "/admin/dashboard";
    dashboardLabel = "Admin Dashboard";
    DashboardIcon = Shield;
  } else if (isSupplier) {
    dashboardHref = "/supplier/dashboard";
    dashboardLabel = "Supplier Dashboard";
    DashboardIcon = Building2;
  } else if (isClient) {
    dashboardHref = "/client/dashboard";
    dashboardLabel = "My Quotes";
    DashboardIcon = User;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent">
          <Avatar className="h-7 w-7">
            <AvatarFallback className="bg-primary/10 text-xs font-medium text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:flex md:flex-col md:items-start">
            <span className="font-medium leading-tight">{session.user.name}</span>
            <span className="text-[10px] text-muted-foreground">
              {roleLabels[role] ?? role}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="font-normal">
          <p className="text-sm font-medium">{session.user.name}</p>
          <p className="text-xs text-muted-foreground">{session.user.email}</p>
          <p className="text-[10px] text-primary mt-1">
            {roleLabels[role] ?? role}
          </p>
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
        {/* Role-specific links */}
        {isSuperAdmin && (
          <DropdownMenuItem asChild>
            <Link href="/admin/dashboard" className="cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        {isSupplier && (
          <DropdownMenuItem asChild>
            <Link href="/supplier/dashboard" className="cursor-pointer">
              <Building2 className="mr-2 h-4 w-4" />
              Supplier Dashboard
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem asChild>
          <Link href={dashboardHref} className="cursor-pointer">
            <DashboardIcon className="mr-2 h-4 w-4" />
            {dashboardLabel}
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
  );
}
