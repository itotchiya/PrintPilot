"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Asterisk } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const confirmPassword = formData.get("confirmPassword") as string;

    if (password !== confirmPassword) {
      setError("Les mots de passe ne correspondent pas");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Une erreur est survenue");
        setIsLoading(false);
        return;
      }

      await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Une erreur est survenue");
      setIsLoading(false);
    }
  }

  return (
    <div className="w-full max-w-[360px] mx-auto">
      <div className="mb-8">
        <Asterisk className="h-8 w-8 text-primary mb-4" />
        <h1 className="text-3xl font-semibold tracking-tight text-foreground mb-2">
          Créer un compte
        </h1>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Inscrivez-vous pour accéder à PrintPilot et commencer à gérer votre production.
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
            <Label htmlFor="name">Nom complet</Label>
            <Input
              id="name"
              name="name"
              placeholder="Jean Dupont"
              autoComplete="name"
              required
              disabled={isLoading}
              className="h-11 px-3 shadow-none bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="votre@email.fr"
              autoComplete="email"
              required
              disabled={isLoading}
              className="h-11 px-3 shadow-none bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              disabled={isLoading}
              className="h-11 px-3 shadow-none bg-background/50 border-border/60 focus-visible:ring-1 focus-visible:ring-primary/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              disabled={isLoading}
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
              Création...
            </>
          ) : (
            "Créer mon compte"
          )}
        </Button>

        <p className="mt-8 text-center text-sm text-muted-foreground">
          Déjà un compte ?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline transition-colors">
            Se connecter
          </Link>
        </p>
      </form>
    </div>
  );
}
