import { NextResponse } from "next/server";
import { getTeamAccess } from "@/features/auth/team-access";
import { PdfCharacterError } from "./commercial-pdf";

export const privatePdfHeaders = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

export async function checkPdfAccess() {
  const access = await getTeamAccess();
  if (access.status !== "allowed") return NextResponse.json({ error: "Ingresá nuevamente para descargar el documento." }, { status: 401, headers: privatePdfHeaders });
  if (!access.roles.includes("designer")) return NextResponse.json({ error: "No tenés permiso para descargar este documento." }, { status: 403, headers: privatePdfHeaders });
  return null;
}

export function pdfResponse(bytes: Uint8Array, filename: string) {
  return new Response(new Uint8Array(bytes).buffer, { headers: { ...privatePdfHeaders, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${filename}"` } });
}

export function pdfErrorResponse(error: unknown) {
  return NextResponse.json({ error: error instanceof PdfCharacterError ? "El documento contiene caracteres no compatibles con el PDF. Revisá los textos del trabajo." : "No pudimos generar el PDF. Intentá nuevamente." }, { status: error instanceof PdfCharacterError ? 422 : 500, headers: privatePdfHeaders });
}
