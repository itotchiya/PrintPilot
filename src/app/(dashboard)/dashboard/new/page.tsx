import { WizardContainer } from "@/components/wizard/WizardContainer";

export default function NewQuotePage() {
  return (
    <div className="min-h-full py-8 px-4">
      <div className="mx-auto max-w-3xl mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          Nouveau devis
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Suivez les étapes pour configurer votre produit
        </p>
      </div>
      <WizardContainer />
    </div>
  );
}
