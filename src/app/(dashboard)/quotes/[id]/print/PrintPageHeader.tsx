"use client";

import { useState } from "react";
import QuoteDetailHeader from "@/components/QuoteDetailHeader";
import type { QuoteStatus } from "@/components/QuoteDetailHeader";
import { downloadQuotePdf } from "./downloadQuotePdf";
import { Loader2 } from "lucide-react";

interface PrintPageHeaderProps {
  quoteId: string;
  quoteNumber: string;
  status: QuoteStatus;
}

export default function PrintPageHeader({
  quoteId,
  quoteNumber,
  status,
}: PrintPageHeaderProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloading(true);
    try {
      await downloadQuotePdf(quoteNumber);
    } catch (e) {
      console.error(e);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <QuoteDetailHeader
      quoteId={quoteId}
      quoteNumber={quoteNumber}
      status={status}
      variant="print"
      noPrint
      onDownloadPdf={handleDownloadPdf}
      isDownloadingPdf={downloading}
    />
  );
}
