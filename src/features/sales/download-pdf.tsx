"use client";

import { useState } from "react";

export function DownloadPdf({ href, filename, label="Descargar PDF para cliente ↓", variant="dark" }: { href: string; filename: string; label?:string; variant?:"dark"|"secondary" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  async function download() {
    setPending(true); setError("");
    try {
      const response = await fetch(href, { cache: "no-store" });
      if (!response.ok || !response.headers.get("Content-Type")?.includes("application/pdf")) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error ?? "No pudimos descargar el PDF. Intentá nuevamente.");
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement("a");
      link.href = url; link.download = filename;
      document.body.appendChild(link); link.click(); link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "No pudimos descargar el PDF."); }
    finally { setPending(false); }
  }
  return <div className="pdf-download"><button type="button" disabled={pending} className={`button ${variant}`} onClick={download}>{pending ? "Generando PDF…" : label}</button>{error && <p className="field-error" role="alert">{error}</p>}</div>;
}
