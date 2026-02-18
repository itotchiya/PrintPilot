"use client";
import { useReducer, useCallback } from "react";
import type { QuoteInput, WizardState, WizardStep } from "@/lib/pricing/types";
import { EMPTY_QUOTE_INPUT } from "@/lib/pricing/types";
import { getVisibleSteps } from "@/lib/pricing/product-rules";

type WizardAction =
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "GO_TO_STEP"; step: WizardStep }
  | { type: "UPDATE_DATA"; data: Partial<QuoteInput> }
  | { type: "RESET" }
  | { type: "SET_CALCULATING"; value: boolean };

function getNextStep(current: WizardStep, data: QuoteInput): WizardStep {
  const visible = getVisibleSteps(data.productType);
  const idx = visible.indexOf(current);
  if (idx === -1 || idx >= visible.length - 1) return current;
  return visible[idx + 1] as WizardStep;
}

function getPrevStep(current: WizardStep, data: QuoteInput): WizardStep {
  const visible = getVisibleSteps(data.productType);
  const idx = visible.indexOf(current);
  if (idx <= 0) return current;
  return visible[idx - 1] as WizardStep;
}

function reducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "NEXT_STEP": {
      const next = getNextStep(state.currentStep, state.data);
      const completed = new Set(state.completedSteps);
      completed.add(state.currentStep);
      return { ...state, currentStep: next, completedSteps: completed };
    }
    case "PREV_STEP":
      return { ...state, currentStep: getPrevStep(state.currentStep, state.data) };
    case "GO_TO_STEP":
      return { ...state, currentStep: action.step };
    case "UPDATE_DATA":
      return { ...state, data: { ...state.data, ...action.data } };
    case "SET_CALCULATING":
      return { ...state, isCalculating: action.value };
    case "RESET":
      return {
        currentStep: 1,
        data: EMPTY_QUOTE_INPUT,
        completedSteps: new Set(),
        isCalculating: false,
      };
    default:
      return state;
  }
}

export function useWizard() {
  const [state, dispatch] = useReducer(reducer, {
    currentStep: 1,
    data: EMPTY_QUOTE_INPUT,
    completedSteps: new Set<WizardStep>(),
    isCalculating: false,
  });

  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);
  const goToStep = useCallback(
    (step: WizardStep) => dispatch({ type: "GO_TO_STEP", step }),
    []
  );
  const updateData = useCallback(
    (data: Partial<QuoteInput>) => dispatch({ type: "UPDATE_DATA", data }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);
  const setCalculating = useCallback(
    (value: boolean) => dispatch({ type: "SET_CALCULATING", value }),
    []
  );

  const visibleSteps = getVisibleSteps(state.data.productType);
  const currentStepIndex = visibleSteps.indexOf(state.currentStep);
  const isFirstStep = currentStepIndex === 0;
  const isLastStep = currentStepIndex === visibleSteps.length - 1;
  const isStepBeforeLast = currentStepIndex === visibleSteps.length - 2;

  return {
    state,
    currentStep: state.currentStep,
    data: state.data,
    completedSteps: state.completedSteps,
    visibleSteps,
    isFirstStep,
    isLastStep,
    isStepBeforeLast,
    nextStep,
    prevStep,
    goToStep,
    updateData,
    reset,
    setCalculating,
    isCalculating: state.isCalculating,
  };
}
