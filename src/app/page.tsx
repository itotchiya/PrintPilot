import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InteractiveGradient } from "@/components/ui/interactive-gradient";
import { Logo } from "@/components/ui/Logo";
import {
  Calculator,
  Zap,
  Shield,
  ArrowRight,
  BarChart3,
  Truck,
  CheckCircle2,
  FileText,
  Layers,
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col bg-background selection:bg-primary/20">
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
            <Logo className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" className="hidden sm:flex" asChild>
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button size="sm" className="rounded-full shadow-sm" asChild>
              <Link href="/register">Essayer gratuitement</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative flex min-h-[85vh] items-center justify-center overflow-hidden border-b border-border/40">
          <div className="absolute inset-0 z-0">
            <InteractiveGradient />
            {/* Subtle gradient overlay to ensure text readability against the dynamic background */}
            <div className="absolute inset-0 bg-background/50 backdrop-blur-[2px]" />
          </div>
          
          <div className="relative z-10 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="mx-auto mb-8 flex max-w-fit items-center justify-center space-x-2 overflow-hidden rounded-full border border-border/50 bg-background/50 px-3 py-1 text-sm font-medium backdrop-blur-md shadow-sm">
                <Zap className="h-4 w-4 text-primary" />
                <span className="text-foreground/80">La nouvelle génération de devis d'impression</span>
              </div>
              
              <h1 className="mx-auto max-w-4xl text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                Gérez vos devis avec une <br className="hidden sm:block" />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
                  précision absolue
                </span>
              </h1>
              
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Calculez instantanément vos prix en numérique et offset. 
                Une plateforme unifiée conçue pour les professionnels de l'impression.
              </p>
              
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Button size="lg" className="h-12 w-full rounded-full px-8 text-base shadow-lg sm:w-auto" asChild>
                  <Link href="/register">
                    Démarrer maintenant
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="lg" className="h-12 w-full rounded-full border-border/50 bg-background/50 px-8 text-base backdrop-blur-md sm:w-auto hover:bg-accent/50" asChild>
                  <Link href="/login">Accéder à mon espace</Link>
                </Button>
              </div>

              <div className="mt-12 flex items-center justify-center gap-6 text-sm text-muted-foreground sm:gap-8">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Sans engagement</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span>Configuration sur-mesure</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bento Grid Features */}
        <section className="relative bg-surface/30 py-24 sm:py-32">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Une architecture repensée
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Des outils puissants cachés derrière une interface minimaliste.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:grid-cols-4 lg:grid-rows-2">
              {/* Feature 1 - Large */}
              <div className="relative group overflow-hidden rounded-3xl border border-border/50 bg-background/50 p-8 shadow-sm backdrop-blur-sm md:col-span-2 lg:col-span-2 lg:row-span-2 flex flex-col transition-all hover:shadow-md hover:border-primary/20">
                <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Calculator className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3">Moteur de calcul hybride</h3>
                <p className="text-muted-foreground flex-1">
                  Obtenez en temps réel la comparaison la plus rentable entre l'impression offset et numérique. 
                  L'algorithme analyse vos quantités, formats et façonnages pour vous suggérer la meilleure approche.
                </p>
                <div className="mt-8 flex gap-2 overflow-hidden rounded-xl border border-border/50 bg-accent/20 p-4">
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-1/2 rounded-full bg-primary/20"></div>
                    <div className="h-2 w-3/4 rounded-full bg-primary/20"></div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="h-2 w-full rounded-full bg-primary/40"></div>
                    <div className="h-2 w-2/3 rounded-full bg-primary/40"></div>
                  </div>
                </div>
              </div>

              {/* Feature 2 */}
              <div className="relative group overflow-hidden rounded-3xl border border-border/50 bg-background/50 p-8 shadow-sm backdrop-blur-sm md:col-span-1 lg:col-span-2 flex flex-col transition-all hover:shadow-md hover:border-primary/20">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Layers className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Gestion multi-produits</h3>
                <p className="text-sm text-muted-foreground">
                  Brochures, flyers, cartes de visite et dépliants. Chaque type de produit possède ses propres règles de calcul et spécificités techniques.
                </p>
              </div>

              {/* Feature 3 */}
              <div className="relative group overflow-hidden rounded-3xl border border-border/50 bg-background/50 p-8 shadow-sm backdrop-blur-sm md:col-span-1 lg:col-span-1 flex flex-col transition-all hover:shadow-md hover:border-primary/20">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Truck className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Logistique avancée</h3>
                <p className="text-sm text-muted-foreground">
                  Calcul automatique des poids et frais de livraison par département.
                </p>
              </div>

              {/* Feature 4 */}
              <div className="relative group overflow-hidden rounded-3xl border border-border/50 bg-background/50 p-8 shadow-sm backdrop-blur-sm md:col-span-1 lg:col-span-1 flex flex-col transition-all hover:shadow-md hover:border-primary/20">
                <div className="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 transition-colors group-hover:bg-primary/20">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Accès sécurisé</h3>
                <p className="text-sm text-muted-foreground">
                  Espaces cloisonnés : Super Admin, Acheteur et Fournisseur.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Workflow / Steps Section */}
        <section className="border-t border-border/40 py-24 sm:py-32 bg-background">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 gap-16 lg:grid-cols-2 lg:items-center">
              <div>
                <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                  Un flux de travail <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">transparent</span>
                </h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Fini les fichiers Excel compliqués et les formules cassées. 
                  L'interface intuitive vous guide de la configuration à l'export.
                </p>
                
                <dl className="mt-10 max-w-xl space-y-8 text-base leading-7 text-muted-foreground">
                  {[
                    {
                      name: 'Configuration instantanée',
                      description: 'Ajustez les papiers, formats et finitions avec des sélecteurs intelligents.',
                      icon: Zap,
                    },
                    {
                      name: 'Analyse des coûts détaillée',
                      description: 'Visualisez exactement où va chaque euro (papier, calage, roulage, finition).',
                      icon: BarChart3,
                    },
                    {
                      name: 'Exportation professionnelle',
                      description: 'Générez des devis en PDF prêts à être envoyés à vos clients en un clic.',
                      icon: FileText,
                    },
                  ].map((feature) => (
                    <div key={feature.name} className="relative pl-12 transition-all hover:text-foreground">
                      <dt className="inline font-semibold text-foreground">
                        <div className="absolute left-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10">
                          <feature.icon className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
                        </div>
                        {feature.name}.
                      </dt>{' '}
                      <dd className="inline">{feature.description}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              
              <div className="relative lg:row-start-1 lg:col-start-2">
                <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-2xl border border-border/50 bg-background shadow-2xl ring-1 ring-border/10">
                  {/* Faux UI to show the vibe */}
                  <div className="flex items-center justify-between border-b border-border/50 bg-muted/30 px-4 py-3">
                    <div className="flex gap-1.5">
                      <div className="h-3 w-3 rounded-full bg-red-500/80"></div>
                      <div className="h-3 w-3 rounded-full bg-yellow-500/80"></div>
                      <div className="h-3 w-3 rounded-full bg-green-500/80"></div>
                    </div>
                    <div className="h-4 w-24 rounded bg-background shadow-sm"></div>
                  </div>
                  <div className="p-6 space-y-6 bg-background">
                    <div className="space-y-2">
                      <div className="h-6 w-1/3 rounded-md bg-muted"></div>
                      <div className="h-4 w-1/2 rounded-md bg-muted/60"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="h-28 rounded-xl border border-border/50 bg-accent/20 p-4 flex flex-col justify-end transition-colors hover:bg-accent/40">
                        <div className="h-3 w-1/2 rounded bg-primary/20 mb-2"></div>
                        <div className="h-5 w-3/4 rounded bg-primary/40"></div>
                      </div>
                      <div className="h-28 rounded-xl border border-border/50 bg-accent/20 p-4 flex flex-col justify-end transition-colors hover:bg-accent/40">
                        <div className="h-3 w-1/2 rounded bg-muted-foreground/20 mb-2"></div>
                        <div className="h-5 w-3/4 rounded bg-muted-foreground/40"></div>
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="h-12 w-full rounded-md bg-muted/30 flex items-center px-4">
                        <div className="h-4 w-1/4 rounded bg-muted-foreground/20"></div>
                      </div>
                      <div className="h-12 w-full rounded-md bg-muted/30 flex items-center px-4">
                        <div className="h-4 w-1/3 rounded bg-muted-foreground/20"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>

      <footer className="border-t border-border/40 bg-background pb-8 pt-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-6 sm:flex-row">
            <div className="flex items-center gap-2">
              <Logo className="h-6 w-auto opacity-70 grayscale transition-all hover:grayscale-0 hover:opacity-100" />
            </div>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} PrintPilot — HAVET-IMB. Tous droits réservés.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
