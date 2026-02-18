import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatCurrency, formatDate } from "@/lib/utils";
import PrintButton from "./PrintButton";

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

  return (
    <>
      {/* Print styles injected via Next.js */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body > div { background: #fff !important; }
          .print-page {
            box-shadow: none !important;
            margin: 0 !important;
            width: 100% !important;
          }
          @page { size: A4; margin: 18mm; }
        }
        .print-page {
          background: #ffffff;
          width: 210mm;
          max-width: 100%;
          min-height: 270mm;
          margin: 24px auto;
          padding: 36px 40px;
          box-shadow: 0 4px 32px rgba(0,0,0,0.10);
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
          color: #212529;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }
      `}</style>

      {/* Toolbar — hidden on print */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
          padding: "20px 0 8px",
          background: "#f8f9fa",
          borderBottom: "1px solid #e9ecef",
          marginBottom: 0,
        }}
      >
        <PrintButton />
        <a
          href={`/quotes`}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "8px 18px",
            borderRadius: 8,
            border: "1px solid #dee2e6",
            background: "#fff",
            color: "#495057",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          ← Retour aux devis
        </a>
      </div>

      {/* A4 document */}
      <div className="print-page">
        {/* ── Company header ────────────────────────────────────────────── */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 36,
            paddingBottom: 24,
            borderBottom: "2px solid #212529",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                letterSpacing: "-0.5px",
                color: "#212529",
                lineHeight: 1,
              }}
            >
              HAVET-IMB
            </div>
            <div
              style={{
                fontSize: 11,
                color: "#6c757d",
                marginTop: 5,
                letterSpacing: 2,
                textTransform: "uppercase" as const,
              }}
            >
              PrintPilot · Gestion des devis
            </div>
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
        <div style={{ marginBottom: 28 }}>
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
        <div style={{ marginBottom: 28 }}>
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

        {/* ── Pricing summary ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 36 }}>
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
      </div>
    </>
  );
}
