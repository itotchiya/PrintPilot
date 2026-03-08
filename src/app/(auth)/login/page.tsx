"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, Shield, Building2, User } from "lucide-react";

// Updated demo accounts for the new 3-tier role system
const DEMO_ACCOUNTS = [
  { 
    email: "superadmin@printquote.com", 
    password: "admin123", 
    label: "Super Admin", 
    icon: Shield,
    description: "Full platform access",
    color: "text-purple-600 bg-purple-100"
  },
  { 
    email: "supplier@printquote.com", 
    password: "admin123", 
    label: "Supplier", 
    icon: Building2,
    description: "Manage clients & pricing",
    color: "text-green-600 bg-green-100"
  },
  { 
    email: "client@printquote.com", 
    password: "admin123", 
    label: "Client", 
    icon: User,
    description: "Generate quotes & compare",
    color: "text-blue-600 bg-blue-100"
  },
] as const;

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function fillDemo(account: (typeof DEMO_ACCOUNTS)[number]) {
    setEmail(account.email);
    setPassword(account.password);
    setError("");
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-[420px] mx-auto space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Welcome Back
        </h1>
        <p className="text-sm text-muted-foreground mt-2">
          Access your quotes, suppliers, and print management in one place.
        </p>
      </div>

      {/* Login Form */}
      <Card>
        <CardContent className="p-6">
          <form onSubmit={onSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="your@email.com"
                autoComplete="email"
                required
                disabled={isLoading}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
                disabled={isLoading}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-11" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Demo Accounts */}
      <div className="space-y-3">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Demo Accounts
            </span>
          </div>
        </div>

        <div className="grid gap-2">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = account.icon;
            return (
              <button
                key={account.email}
                type="button"
                onClick={() => fillDemo(account)}
                className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm transition-colors hover:border-primary/30 hover:bg-accent text-left w-full"
              >
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${account.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium leading-none truncate">{account.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground truncate">{account.description}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-medium text-primary hover:underline transition-colors">
          Sign up
        </Link>
      </p>
    </div>
  );
}
