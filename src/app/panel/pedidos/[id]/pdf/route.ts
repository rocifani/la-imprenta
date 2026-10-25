import { NextResponse } from "next/server";
import { getTeamAccess } from "@/features/auth/team-access";
import { getOrder, validId } from "@/features/sales/queries";
import { customerOrderDocument } from "@/features/sales/order-document";
import { buildOrderPdf, PdfCharacterError } from "@/features/sales/order-pdf";
import { loadPdfAssets } from "@/features/sales/pdf-assets";
import { documentNumber } from "@/features/sales/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const access = await getTeamAccess();
  if (access.status !== "allowed") return NextResponse.json({ error: "Ingresá nuevamente para descargar la nota." }, { status: 401, headers });
  if (!access.roles.includes("designer")) return NextResponse.json({ error: "No tenés permiso para descargar esta nota." }, { status: 403, headers });
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "La nota no existe." }, { status: 404, headers });
  const { order, items } = await getOrder(id);
  try {
    const bytes = await buildOrderPdf(customerOrderDocument(order, items), await loadPdfAssets());
    return new Response(new Uint8Array(bytes).buffer, { headers: { ...headers, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="nota-pedido-${documentNumber("NP", order.number)}.pdf"` } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof PdfCharacterError ? "El documento contiene caracteres no compatibles con el PDF. Revisá los textos del trabajo." : "No pudimos generar el PDF. Intentá nuevamente." }, { status: error instanceof PdfCharacterError ? 422 : 500, headers });
  }
}
