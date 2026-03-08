import { SingleMethodWizardContainer } from "@/components/wizard/SingleMethodWizardContainer";

export const metadata = {
  title: "Nouveau devis offset | PrintPilot",
  description: "Créer un nouveau devis avec calcul offset uniquement",
};

export default function ClientNewOffsetQuotePage() {
  return (
    <div className="min-h-full py-8 px-4">
      <div className="mx-auto max-w-3xl mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Nouveau devis offset
          </h1>
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
            Offset
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Configurez votre produit pour une impression offset uniquement
        </p>
      </div>
      <SingleMethodWizardContainer
        method="offset"
        title="Nouveau devis offset"
        subtitle="Configurez votre produit pour une impression offset uniquement"
      />
    </div>
  );
}
