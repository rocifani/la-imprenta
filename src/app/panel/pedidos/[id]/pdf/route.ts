import { NextResponse } from "next/server";
import { getOrder, validId } from "@/features/sales/queries";
import { customerOrderDocument } from "@/features/sales/order-document";
import { buildCommercialPdf } from "@/features/sales/commercial-pdf";
import { checkPdfAccess, privatePdfHeaders, pdfResponse, pdfErrorResponse } from "@/features/sales/pdf-response";
import { loadPdfAssets } from "@/features/sales/pdf-assets";
import { documentNumber } from "@/features/sales/money";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkPdfAccess();
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "La nota no existe." }, { status: 404, headers: privatePdfHeaders });
  const { order, items, money } = await getOrder(id);
  try {
    const bytes = await buildCommercialPdf(customerOrderDocument(order, items, money), await loadPdfAssets());
    return pdfResponse(bytes, `nota-pedido-${documentNumber("NP", order.number)}.pdf`);
  } catch (error) { return pdfErrorResponse(error); }
}
