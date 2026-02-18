"use client";

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 20px",
        borderRadius: 8,
        border: "none",
        background: "#212529",
        color: "#fff",
        fontSize: 14,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      🖨 Imprimer / Enregistrer en PDF
    </button>
  );
}
