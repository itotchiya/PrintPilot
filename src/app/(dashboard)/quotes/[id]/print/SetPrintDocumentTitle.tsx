"use client";

import { useEffect } from "react";

/**
 * Sets document.title so that when the user saves as PDF, the default
 * filename is "PrintPilot-devis-{quoteNumber}" (e.g. PrintPilot-devis-PP-202602-V77G).
 */
export default function SetPrintDocumentTitle({
  quoteNumber,
}: {
  quoteNumber: string;
}) {
  useEffect(() => {
    const base = "PrintPilot-devis";
    const safe = (quoteNumber || "").trim() || "devis";
    document.title = `${base}-${safe}`;
    return () => {
      document.title = "PrintPilot";
    };
  }, [quoteNumber]);

  return null;
}
