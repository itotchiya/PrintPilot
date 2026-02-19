import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import PrintPageHeader from "./PrintPageHeader";
import SetPrintDocumentTitle from "./SetPrintDocumentTitle";

type Props = { params: Promise<{ id: string }> };

const PRODUCT_LABELS: Record<string, string> = {
  BROCHURE: "Brochure",
  DEPLIANT: "Dépliant",
  FLYER: "Flyer / Poster",
  CARTE_DE_VISITE: "Carte de visite",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Brouillon",
  SENT: "Envoyé",
  ACCEPTED: "Accepté",
  REJECTED: "Refusé",
  EXPIRED: "Expiré",
};

function statusColor(status: string) {
  switch (status) {
    case "ACCEPTED":
      return { bg: "#d1fae5", text: "#065f46" };
    case "REJECTED":
      return { bg: "#fee2e2", text: "#991b1b" };
    case "SENT":
      return { bg: "#dbeafe", text: "#1e40af" };
    default:
      return { bg: "#f3f4f6", text: "#374151" };
  }
}

function SpecRow({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <tr>
      <td
        style={{
          padding: "8px 14px",
          backgroundColor: "#f8f9fa",
          fontWeight: 600,
          width: "42%",
          borderBottom: "1px solid #e9ecef",
          fontSize: 13,
          color: "#495057",
          verticalAlign: "top",
        }}
      >
        {label}
      </td>
      <td
        style={{
          padding: "8px 14px",
          borderBottom: "1px solid #e9ecef",
          fontSize: 13,
          color: "#212529",
        }}
      >
        {value}
      </td>
    </tr>
  );
}

export default async function QuotePrintPage({ params }: Props) {
  const { id } = await params;

  const quote = await prisma.quote.findUnique({
    where: { id },
    include: { user: { select: { name: true, email: true } } },
  });

  if (!quote) notFound();

  const price =
    quote.selectedMethod === "digital"
      ? quote.digitalPrice
      : quote.selectedMethod === "offset"
        ? quote.offsetPrice
        : (quote.digitalPrice ?? quote.offsetPrice);

  const methodLabel =
    quote.selectedMethod === "digital"
      ? "Impression Numérique"
      : quote.selectedMethod === "offset"
        ? "Impression Offset"
        : "—";

  const sColor = statusColor(quote.status);

  // Normalize delivery points for display (wizard stores departmentName, departmentCode, copies)
  type StoredPoint = {
    departmentName?: string;
    departmentCode?: string;
    copies?: number;
    name?: string;
    department?: string;
    quantity?: number;
  };
  const rawPoints = (quote.deliveryPoints as StoredPoint[] | null) ?? [];
  const deliveryPoints = Array.isArray(rawPoints)
    ? rawPoints.map((p) => ({
        name: p.departmentName ?? p.name ?? "—",
        department: p.departmentCode ?? p.department ?? "—",
        quantity: p.copies ?? p.quantity ?? 0,
      }))
    : [];
  const hasDeliveryPoints = deliveryPoints.length > 0;

  return (
    <>
      {/* Print styles: same padding on every page via @page; page number bottom-right; sections don't split. */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body * { visibility: hidden; }
          .print-page, .print-page * { visibility: visible; }
          .print-page {
            position: relative !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            min-height: auto !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            background: #fff !important;
          }
          .print-section {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .print-page-number {
            display: block !important;
            position: fixed !important;
            bottom: 10mm !important;
            right: 8.5mm !important;
            font-size: 11px !important;
            color: #6c757d !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif !important;
          }
          .print-page-number::after {
            content: counter(page) " / " counter(pages) !important;
          }
          @page {
            size: A4;
            margin: 7.5mm 8.5mm 12mm 8.5mm;
          }
        }
        .print-page {
          background: #ffffff;
          width: 210mm;
          max-width: 100%;
          min-height: 270mm;
          margin: 24px auto;
          padding: 28px 32px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.10);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          color: #212529;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
        .print-page-number { display: none; }
      `}</style>

      <SetPrintDocumentTitle quoteNumber={quote.quoteNumber} />
      <PrintPageHeader
        quoteId={id}
        quoteNumber={quote.quoteNumber}
        status={quote.status as "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"}
      />


      {/* A4 document — only this section is printed / saved as PDF (matches preview exactly) */}
      <div className="print-page">
        {/* ── Company header: logo only (height matches right column) ─────── */}
        <div
          className="print-section"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 36,
          }}
        >
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/uploads/logo-PDF.svg"
              alt="PrintPilot"
              style={{
                height: 64,
                width: "auto",
                objectFit: "contain",
              }}
            />
          </div>

          <div style={{ textAlign: "right" as const }}>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "#212529",
                fontFamily: "monospace",
                letterSpacing: "0.04em",
              }}
            >
              {quote.quoteNumber}
            </div>
            <div style={{ fontSize: 13, color: "#6c757d", marginTop: 4 }}>
              Date : {formatDate(quote.createdAt)}
            </div>
            <div
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "3px 12px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.05em",
                textTransform: "uppercase" as const,
                background: sColor.bg,
                color: sColor.text,
              }}
            >
              {STATUS_LABELS[quote.status] ?? quote.status}
            </div>
          </div>
        </div>

        {/* ── Client info ───────────────────────────────────────────────── */}
        <div className="print-section" style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase" as const,
              color: "#adb5bd",
              marginBottom: 8,
            }}
          >
            Client
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#212529" }}>
            {quote.user.name}
          </div>
          <div style={{ fontSize: 13, color: "#6c757d", marginTop: 3 }}>
            {quote.user.email}
          </div>
        </div>

        {/* ── Specifications table ──────────────────────────────────────── */}
        <div className="print-section" style={{ marginBottom: 28 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase" as const,
              color: "#adb5bd",
              marginBottom: 10,
            }}
          >
            Spécifications
          </div>
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse" as const,
              border: "1px solid #e9ecef",
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <tbody>
              <SpecRow
                label="Type de produit"
                value={
                  PRODUCT_LABELS[quote.productType] ?? quote.productType
                }
              />
              <SpecRow
                label="Quantité"
                value={`${quote.quantity.toLocaleString("fr-FR")} exemplaires`}
              />
              <SpecRow
                label="Format fermé"
                value={`${quote.formatWidth} × ${quote.formatHeight} cm (${quote.formatName})`}
              />
              {quote.openFormatWidth && quote.openFormatHeight && (
                <SpecRow
                  label="Format ouvert"
                  value={`${quote.openFormatWidth} × ${quote.openFormatHeight} cm`}
                />
              )}
              {quote.pagesInterior != null && (
                <SpecRow
                  label="Pages intérieur"
                  value={String(quote.pagesInterior)}
                />
              )}
              {(quote.pagesCover ?? 0) > 0 && (
                <SpecRow
                  label="Pages couverture"
                  value={String(quote.pagesCover)}
                />
              )}
              {quote.paperInteriorType && (
                <SpecRow
                  label="Papier intérieur"
                  value={`${quote.paperInteriorType}${quote.paperInteriorGram ? ` — ${quote.paperInteriorGram} g/m²` : ""}`}
                />
              )}
              {quote.paperCoverType && (
                <SpecRow
                  label="Papier couverture"
                  value={`${quote.paperCoverType}${quote.paperCoverGram ? ` — ${quote.paperCoverGram} g/m²` : ""}`}
                />
              )}
              {quote.colorModeInterior && (
                <SpecRow
                  label="Couleur intérieur"
                  value={quote.colorModeInterior}
                />
              )}
              {quote.colorModeCover && (
                <SpecRow
                  label="Couleur couverture"
                  value={quote.colorModeCover}
                />
              )}
              <SpecRow
                label="Recto-verso"
                value={quote.rectoVerso ? "Oui" : "Non"}
              />
              {quote.bindingType && (
                <SpecRow label="Reliure" value={quote.bindingType} />
              )}
              {quote.foldType && (
                <SpecRow
                  label="Pliage"
                  value={`${quote.foldType}${quote.foldCount ? ` × ${quote.foldCount}` : ""}`}
                />
              )}
              {quote.laminationMode && quote.laminationMode !== "Rien" && (
                <SpecRow
                  label="Pelliculage"
                  value={`${quote.laminationMode}${quote.laminationFinish ? ` — ${quote.laminationFinish}` : ""}`}
                />
              )}
            </tbody>
          </table>
        </div>

        {/* ── Points de livraison ───────────────────────────────────────── */}
        {hasDeliveryPoints && (
          <div className="print-section" style={{ marginBottom: 28 }}>
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
                color: "#adb5bd",
                marginBottom: 10,
              }}
            >
              Points de livraison
            </div>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse" as const,
                border: "1px solid #e9ecef",
                fontSize: 13,
              }}
            >
              <thead>
                <tr style={{ background: "#f8f9fa" }}>
                  <th
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#495057",
                      borderBottom: "1px solid #e9ecef",
                    }}
                  >
                    Nom / Adresse
                  </th>
                  <th
                    style={{
                      padding: "10px 14px",
                      textAlign: "left",
                      fontWeight: 600,
                      color: "#495057",
                      borderBottom: "1px solid #e9ecef",
                    }}
                  >
                    Département
                  </th>
                  <th
                    style={{
                      padding: "10px 14px",
                      textAlign: "right",
                      fontWeight: 600,
                      color: "#495057",
                      borderBottom: "1px solid #e9ecef",
                    }}
                  >
                    Quantité
                  </th>
                </tr>
              </thead>
              <tbody>
                {deliveryPoints.map((point, i) => (
                  <tr key={i}>
                    <td
                      style={{
                        padding: "8px 14px",
                        borderBottom: "1px solid #e9ecef",
                        color: "#212529",
                      }}
                    >
                      {point.name}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        borderBottom: "1px solid #e9ecef",
                        color: "#212529",
                      }}
                    >
                      {point.department}
                    </td>
                    <td
                      style={{
                        padding: "8px 14px",
                        borderBottom: "1px solid #e9ecef",
                        color: "#212529",
                        textAlign: "right",
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {point.quantity.toLocaleString("fr-FR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pricing summary ───────────────────────────────────────────── */}
        <div className="print-section" style={{ marginBottom: 36 }}>
          <div
            style={{
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: 2,
              textTransform: "uppercase" as const,
              color: "#adb5bd",
              marginBottom: 10,
            }}
          >
            Tarification
          </div>
          <div
            style={{
              background: "#f8f9fa",
              border: "1px solid #e9ecef",
              borderRadius: 10,
              padding: "18px 22px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 12, color: "#6c757d" }}>
                  Méthode retenue
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#212529",
                    marginTop: 3,
                  }}
                >
                  {methodLabel}
                </div>
              </div>
              <div style={{ textAlign: "right" as const }}>
                <div style={{ fontSize: 12, color: "#6c757d" }}>
                  Montant HT
                </div>
                <div
                  style={{
                    fontSize: 30,
                    fontWeight: 800,
                    color: "#212529",
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.1,
                    marginTop: 3,
                  }}
                >
                  {price != null ? formatCurrency(Number(price)) : "—"}
                </div>
              </div>
            </div>
            {quote.deliveryCost != null &&
              Number(quote.deliveryCost) > 0 && (
                <div
                  style={{
                    marginTop: 14,
                    paddingTop: 14,
                    borderTop: "1px solid #dee2e6",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                    color: "#6c757d",
                  }}
                >
                  <span>dont livraison</span>
                  <span>
                    {formatCurrency(Number(quote.deliveryCost))}
                  </span>
                </div>
              )}
          </div>
        </div>

        {/* ── Footer / CGV ──────────────────────────────────────────────── */}
        <div
          className="print-section"
          style={{
            borderTop: "1px solid #e9ecef",
            paddingTop: 18,
          }}
        >
          <p
            style={{
              fontSize: 10,
              color: "#6c757d",
              lineHeight: 1.7,
              margin: 0,
            }}
          >
            <strong>Conditions générales :</strong> Prix HT. TVA non applicable
            — Article 293 B du CGI. Devis valable 30 jours à compter de sa date
            d&apos;émission. Tout bon de commande implique l&apos;acceptation de
            nos conditions générales de vente disponibles sur demande. Les délais
            de livraison sont donnés à titre indicatif et ne constituent pas un
            engagement contractuel.{" "}
            <strong>HAVET-IMB · PrintPilot</strong> — contact@havet-imb.fr
          </p>
        </div>

        {/* Page number: fixed bottom-right on every printed page (print only) */}
        <div className="print-page-number" aria-hidden />
      </div>
    </>
  );
}
