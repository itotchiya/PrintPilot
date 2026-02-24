import type React from "react";

/**
 * Blur the currently focused element so Radix Select can apply aria-hidden
 * to the rest of the page without triggering "Blocked aria-hidden" (focus
 * must not be hidden). Call when a Select is about to open.
 */
export function blurActiveElement(): void {
  if (document.activeElement instanceof HTMLElement) {
    document.activeElement.blur();
  }
}

/**
 * Use as onPointerDown on SelectTrigger: blurs whatever currently has focus
 * (if it's not the trigger) so opening the dropdown doesn't hide a focused
 * ancestor. Fixes aria-hidden accessibility warning and dropdown not opening.
 */
export function onWizardSelectTriggerPointerDown(
  e: React.PointerEvent<HTMLButtonElement>
): void {
  if (document.activeElement !== e.currentTarget) {
    blurActiveElement();
  }
}
