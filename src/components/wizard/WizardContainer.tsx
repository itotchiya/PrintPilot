"use client";
import { useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Calculator, Loader2 } from "lucide-react";
import { WizardProgress } from "./WizardProgress";
import { useWizard } from "@/hooks/useWizard";
import type { WizardStep } from "@/lib/pricing/types";
import { validateStep } from "@/lib/pricing/wizard-validation";
import { getStepLabel } from "@/lib/pricing/product-rules";

// Step components (imported lazily to keep bundle small)
import { StepProductType } from "./steps/StepProductType";
import { StepQuantityFormat } from "./steps/StepQuantityFormat";
import { StepPages } from "./steps/StepPages";
import { StepPaper } from "./steps/StepPaper";
import { StepColors } from "./steps/StepColors";
import { StepFinishing } from "./steps/StepFinishing";
import { StepDelivery } from "./steps/StepDelivery";
import { StepSummary } from "./steps/StepSummary";

export interface StepProps {
  data: ReturnType<typeof useWizard>["data"];
  updateData: ReturnType<typeof useWizard>["updateData"];
  onNext: () => void;
  onReset?: () => void;
}

export function WizardContainer() {
  const wizard = useWizard();
  const {
    currentStep,
    visibleSteps,
    completedSteps,
    isFirstStep,
    isLastStep,
    isStepBeforeLast,
  } = wizard;

  const stepValidation = useMemo(
    () => validateStep(wizard.currentStep, wizard.data),
    [wizard.currentStep, wizard.data]
  );
  const canGoNext = stepValidation.valid;

  const handleNext = useCallback(() => {
    if (!canGoNext && stepValidation.missing?.length) {
      toast.error(
        `Champs requis : ${stepValidation.missing.join(", ")}`,
        { id: "wizard-validation" }
      );
      return;
    }
    // Log step completion for debugging / tracking
    if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
      const label = getStepLabel(wizard.currentStep);
      console.groupCollapsed(`[PrintPilot Wizard] Étape ${wizard.currentStep} enregistrée — ${label}`);
      console.log("Données actuelles (snapshot):", JSON.parse(JSON.stringify(wizard.data)));
      console.groupEnd();
    }
    wizard.nextStep();
  }, [canGoNext, stepValidation.missing, wizard.currentStep, wizard.data, wizard.nextStep]);

  const handlePrev = useCallback(
    () => wizard.prevStep(),
    [wizard.prevStep]
  );

  const stepProps: StepProps = {
    data: wizard.data,
    updateData: wizard.updateData,
    onNext: handleNext,
    onReset: wizard.reset,
  };

  function renderStep() {
    switch (currentStep) {
      case 1:
        return <StepProductType {...stepProps} />;
      case 2:
        return <StepQuantityFormat {...stepProps} />;
      case 3:
        return <StepPages {...stepProps} />;
      case 4:
        return <StepPaper {...stepProps} />;
      case 5:
        return <StepColors {...stepProps} />;
      case 6:
        return <StepFinishing {...stepProps} />;
      case 7:
        return <StepDelivery {...stepProps} />;
      case 8:
        return <StepSummary {...stepProps} />;
      default:
        return null;
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <WizardProgress
        currentStep={currentStep}
        visibleSteps={visibleSteps}
        completedSteps={completedSteps}
        onStepClick={(step) => wizard.goToStep(step as WizardStep)}
      />

      {/* Step content */}
      <div className="rounded-2xl border bg-card shadow-sm">
        <div className="p-6 md:p-8">{renderStep()}</div>
      </div>

      {/* Navigation — not shown on step 1 (clicks auto-advance) or step 8 (has own buttons) */}
      {currentStep !== 1 && currentStep !== 8 && (
        <div className="space-y-2 pb-4">
          {!canGoNext && stepValidation.missing && stepValidation.missing.length > 0 && (
            <p className="text-sm text-amber-600 dark:text-amber-400">
              Complétez les champs requis : {stepValidation.missing.join(", ")}
            </p>
          )}
          <div className="flex items-center justify-between">
            <Button variant="outline" onClick={handlePrev} disabled={isFirstStep}>
              <ArrowLeft className="size-4" />
              Précédent
            </Button>
            <Button
              onClick={handleNext}
              disabled={wizard.isCalculating || !canGoNext}
            >
              {wizard.isCalculating ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isStepBeforeLast ? (
                <Calculator className="size-4" />
              ) : (
                <ArrowRight className="size-4" />
              )}
              {isStepBeforeLast ? "Calculer" : "Suivant"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
