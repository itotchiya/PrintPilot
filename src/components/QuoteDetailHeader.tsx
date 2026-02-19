"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  FileText,
  Trash2,
  Printer,
  FileDown,
  Loader2,
} from "lucide-react";

export type QuoteStatus =
  | "DRAFT"
  | "SENT"
  | "ACCEPTED"
  | "REJECTED"
  | "EXPIRED";

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
};

const STATUS_CLASSES: Record<QuoteStatus, string> = {
  DRAFT: "bg-secondary text-secondary-foreground border-transparent",
  SENT: "bg-blue-100 text-blue-700 border-transparent dark:bg-blue-900/30 dark:text-blue-400",
  ACCEPTED:
    "bg-green-100 text-green-700 border-transparent dark:bg-green-900/30 dark:text-green-400",
  REJECTED:
    "bg-red-100 text-red-700 border-transparent dark:bg-red-900/30 dark:text-red-400",
  EXPIRED:
    "bg-orange-100 text-orange-700 border-transparent dark:bg-orange-900/30 dark:text-orange-400",
};

export interface QuoteDetailHeaderProps {
  quoteId: string;
  quoteNumber: string;
  status: QuoteStatus;
  /** "detail" = single devis page (back to list, Aperçu PDF, Supprimer). "print" = print page (back to devis, Imprimer, Télécharger PDF) */
  variant: "detail" | "print";
  /** For variant="detail": called when Supprimer is clicked */
  onDeleteClick?: () => void;
  /** Optional: add no-print class when true (e.g. on print page so header is hidden when printing) */
  noPrint?: boolean;
  /** For variant="print": if provided, "Télécharger PDF" runs this instead of window.print() (generates PDF without browser URL) */
  onDownloadPdf?: () => void | Promise<void>;
  /** For variant="print": show loading state on the download button */
  isDownloadingPdf?: boolean;
}

export default function QuoteDetailHeader({
  quoteId,
  quoteNumber,
  status,
  variant,
  onDeleteClick,
  noPrint = false,
  onDownloadPdf,
  isDownloadingPdf = false,
}: QuoteDetailHeaderProps) {
  const wrapperClass = [
    "flex flex-wrap items-center justify-between gap-4 border-b border-border bg-background px-4 py-3",
    noPrint ? "no-print" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <header className={wrapperClass}>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" className="-ml-2" asChild>
          <Link href={variant === "detail" ? "/quotes" : `/quotes/${quoteId}`}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            {variant === "detail"
              ? "Mes devis"
              : `Retour au devis ${quoteNumber}`}
          </Link>
        </Button>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          {variant === "print" ? (
            <span className="text-sm font-semibold text-foreground">
              Aperçu PDF
            </span>
          ) : (
            <>
              <span className="font-mono text-sm font-semibold tracking-wide">
                {quoteNumber}
              </span>
              <Badge className={STATUS_CLASSES[status]}>
                {STATUS_LABELS[status]}
              </Badge>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2">
        {variant === "detail" && (
          <>
            <Button variant="outline" size="sm" asChild>
              <Link href={`/quotes/${quoteId}/print`}>
                <FileText className="mr-1.5 h-4 w-4" />
                Aperçu PDF
              </Link>
            </Button>
            {onDeleteClick != null && (
              <Button
                variant="outline"
                size="sm"
                className="border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
                onClick={onDeleteClick}
              >
                <Trash2 className="mr-1.5 h-4 w-4" />
                Supprimer
              </Button>
            )}
          </>
        )}
        {variant === "print" && (
          <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                type="button"
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Imprimer
              </Button>
              <Button
                size="sm"
                onClick={
                  onDownloadPdf
                    ? () => void onDownloadPdf()
                    : () => window.print()
                }
                type="button"
                disabled={isDownloadingPdf}
              >
                {isDownloadingPdf ? (
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                ) : (
                  <FileDown className="mr-1.5 h-4 w-4" />
                )}
                {isDownloadingPdf ? "Génération…" : "Télécharger PDF"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
