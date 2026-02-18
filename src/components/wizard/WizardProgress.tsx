"use client";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { getStepLabel } from "@/lib/pricing/product-rules";
import type { WizardStep } from "@/lib/pricing/types";

interface WizardProgressProps {
  currentStep: WizardStep;
  visibleSteps: number[];
  completedSteps: Set<WizardStep>;
  onStepClick?: (step: WizardStep) => void;
}

export function WizardProgress({
  currentStep,
  visibleSteps,
  completedSteps,
  onStepClick,
}: WizardProgressProps) {
  return (
    <nav aria-label="Étapes du devis" className="mb-8">
      {/* Mobile: simple progress bar + label */}
      <div className="sm:hidden space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium text-foreground">
            Étape {visibleSteps.indexOf(currentStep) + 1} / {visibleSteps.length}
          </span>
          <span className="text-muted-foreground">
            {getStepLabel(currentStep)}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-primary transition-all duration-300"
            style={{
              width: `${((visibleSteps.indexOf(currentStep) + 1) / visibleSteps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {/* Desktop: step dots with labels */}
      <ol className="hidden sm:flex items-center w-full">
        {visibleSteps.map((step, idx) => {
          const isActive = step === currentStep;
          const isDone = completedSteps.has(step as WizardStep);
          const isClickable = isDone && onStepClick;

          return (
            <li
              key={step}
              className={cn(
                "flex items-center",
                idx < visibleSteps.length - 1 && "flex-1"
              )}
            >
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => isClickable && onStepClick(step as WizardStep)}
                className={cn(
                  "flex flex-col items-center gap-1.5 group",
                  !isClickable && "cursor-default"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-semibold transition-all",
                    isActive && "border-primary bg-primary text-primary-foreground",
                    isDone &&
                      !isActive &&
                      "border-primary bg-primary/15 text-primary",
                    !isActive &&
                      !isDone &&
                      "border-border bg-background text-muted-foreground"
                  )}
                >
                  {isDone && !isActive ? (
                    <Check className="size-4" />
                  ) : (
                    idx + 1
                  )}
                </span>
                <span
                  className={cn(
                    "text-[10px] font-medium whitespace-nowrap hidden lg:block",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {getStepLabel(step)}
                </span>
              </button>
              {idx < visibleSteps.length - 1 && (
                <div
                  className={cn(
                    "flex-1 h-0.5 mx-2 rounded-full transition-all",
                    isDone ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
