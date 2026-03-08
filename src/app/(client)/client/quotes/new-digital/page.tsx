import { SingleMethodWizardContainer } from "@/components/wizard/SingleMethodWizardContainer";

export const metadata = {
  title: "Nouveau devis numérique | PrintPilot",
  description: "Créer un nouveau devis avec calcul numérique uniquement",
};

export default function ClientNewDigitalQuotePage() {
  return (
    <div className="min-h-full py-8 px-4">
      <div className="mx-auto max-w-3xl mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Nouveau devis numérique
          </h1>
          <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
            Numérique
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Configurez votre produit pour une impression numérique uniquement
        </p>
      </div>
      <SingleMethodWizardContainer
        method="digital"
        title="Nouveau devis numérique"
        subtitle="Configurez votre produit pour une impression numérique uniquement"
      />
    </div>
  );
}
