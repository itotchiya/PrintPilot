import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Printer,
  Calculator,
  Zap,
  Shield,
  ArrowRight,
  BarChart3,
  Truck,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 md:px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
              <Printer className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-semibold tracking-tight">
              PrintPilot
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/register">Créer un compte</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-4 py-20 md:px-6 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mb-6 inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              <Zap className="h-3 w-3" />
              Numérique & Offset en un clic
            </div>
            <h1 className="text-4xl font-semibold tracking-tight md:text-5xl">
              Vos devis d&apos;impression,{" "}
              <span className="text-primary">simplifiés</span>
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Calculez instantanément vos prix en numérique et offset.
              Comparez, choisissez et exportez vos devis en quelques étapes.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild>
                <Link href="/register">
                  Créer un devis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" size="lg" asChild>
                <Link href="/login">Se connecter</Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="border-t border-border bg-surface/50">
          <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
            <div className="mb-12 text-center">
              <h2 className="text-2xl font-semibold tracking-tight">
                Tout ce dont vous avez besoin
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Un outil complet pour gérer vos devis d&apos;impression
              </p>
            </div>
            <div className="grid gap-8 md:grid-cols-3">
              <FeatureCard
                icon={Calculator}
                title="Calcul instantané"
                description="Prix numérique et offset calculés en temps réel avec comparaison côte à côte."
              />
              <FeatureCard
                icon={BarChart3}
                title="Détail des coûts"
                description="Papier, impression, façonnage, pelliculage — chaque poste de coût est transparent."
              />
              <FeatureCard
                icon={Truck}
                title="Livraison incluse"
                description="Tarifs par département, multi-points, avec calcul automatique du poids."
              />
              <FeatureCard
                icon={Shield}
                title="Accès sécurisé"
                description="Espace client, employé et administrateur avec des droits différenciés."
              />
              <FeatureCard
                icon={Printer}
                title="4 types de produit"
                description="Brochures, dépliants, flyers et cartes de visite — chacun avec ses règles."
              />
              <FeatureCard
                icon={Zap}
                title="Configuration flexible"
                description="Tous les paramètres de tarification sont modifiables depuis le panneau admin."
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 md:px-6">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} PrintPilot — HAVET-IMB
          </p>
          <p className="text-xs text-muted-foreground">
            Impression numérique & offset
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
