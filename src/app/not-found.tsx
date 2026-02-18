import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Printer, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10">
        <Printer className="h-10 w-10 text-primary" />
      </div>
      <p className="text-7xl font-extrabold tracking-tight text-primary">404</p>
      <h1 className="mt-3 text-2xl font-semibold">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-muted-foreground">
        Cette page n&apos;existe pas ou a été déplacée. Vérifiez l&apos;adresse ou revenez à
        l&apos;accueil.
      </p>
      <div className="mt-8 flex gap-3">
        <Button asChild variant="outline">
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour à l&apos;accueil
          </Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard/new">Nouveau devis</Link>
        </Button>
      </div>
    </div>
  );
}
