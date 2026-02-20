"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, UserCog, Store, ShoppingCart, Asterisk } from "lucide-react";

const DEMO_ACCOUNTS = [
  { email: "superadmin@printpilot.fr", password: "admin123", label: "SuperAdmin", icon: UserCog },
  { email: "admin@printpilot.fr", password: "admin123", label: "Fournisseur", icon: Store },
  { email: "acheteur@printpilot.fr", password: "admin123", label: "Acheteur", icon: ShoppingCart },
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
      setError("Identifiants invalides");
      setIsLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="w-full max-w-[360px] mx-auto">
      <div className="mb-8">
        <Asterisk className="h-8 w-8 text-primary mb-4" />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
          Bon retour
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Accédez à vos devis, commandes et gestion de production en un seul endroit.
        </p>
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Votre e-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="votre@email.fr"
              autoComplete="email"
              required
              disabled={isLoading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 px-3 shadow-none bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
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
              className="h-11 px-3 shadow-none bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          className="w-full h-11 bg-foreground text-background hover:bg-foreground/90 font-medium" 
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Connexion...
            </>
          ) : (
            "Se connecter"
          )}
        </Button>

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/40" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-background px-2 text-muted-foreground">
              Comptes démo
            </span>
          </div>
        </div>

        <div className="flex gap-2">
          {DEMO_ACCOUNTS.map((account) => {
            const Icon = account.icon;
            return (
              <Button
                key={account.email}
                type="button"
                variant="outline"
                size="sm"
                className="flex-1 h-10 border-border/50 shadow-none text-xs bg-background/50 hover:bg-muted/50 px-0"
                onClick={() => fillDemo(account)}
                title={account.label}
              >
                <Icon className="h-4 w-4" />
                <span className="sr-only">{account.label}</span>
              </Button>
            );
          })}
        </div>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-medium text-foreground hover:underline transition-colors">
            S'inscrire
          </Link>
        </p>
      </form>
    </div>
  );
}
