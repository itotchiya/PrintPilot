"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-destructive/10">
        <AlertCircle className="h-10 w-10 text-destructive" />
      </div>
      <h1 className="text-2xl font-semibold">Une erreur est survenue</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Quelque chose s&apos;est mal passé. Veuillez réessayer ou contacter le support si le
        problème persiste.
      </p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-muted-foreground">Code: {error.digest}</p>
      )}
      <div className="mt-8 flex gap-3">
        <Button onClick={reset}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Réessayer
        </Button>
        <Button variant="outline" onClick={() => (window.location.href = "/dashboard")}>
          Tableau de bord
        </Button>
      </div>
    </div>
  );
}
