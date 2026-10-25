import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getQuote, validId } from "@/features/sales/queries";
import { customerQuoteDocument } from "@/features/sales/quote-document";
import { buildCommercialPdf } from "@/features/sales/commercial-pdf";
import { checkPdfAccess, privatePdfHeaders, pdfResponse, pdfErrorResponse } from "@/features/sales/pdf-response";
import { loadPdfAssets } from "@/features/sales/pdf-assets";
import { documentNumber } from "@/features/sales/money";
import type { QuoteItem, QuoteVersion } from "@/features/sales/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await checkPdfAccess();
  if (denied) return denied;
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "El presupuesto no existe." }, { status: 404, headers: privatePdfHeaders });
  const current = await getQuote(id);
  const parameter = new URL(request.url).searchParams.get("revision");
  const revision = parameter === null ? current.quote.revision : Number(parameter);
  if (!Number.isSafeInteger(revision) || revision < 1 || revision > current.quote.revision) return NextResponse.json({ error: "La versión no existe." }, { status: 404, headers: privatePdfHeaders });
  let version = current.version;
  let items = current.items;
  if (revision !== current.quote.revision) {
    const db = await createSupabaseServerClient();
    const { data, error } = await db.from("quote_versions").select("*").eq("quote_id", id).eq("revision", revision).single();
    if (error) return pdfErrorResponse(error);
    const { data: oldItems, error: itemsError } = await db.from("quote_items").select("description,specifications,quantity,amount").eq("version_id", data.id).order("position");
    if (itemsError) return pdfErrorResponse(itemsError);
    version = data as QuoteVersion; items = oldItems as QuoteItem[];
  }
  try {
    const bytes = await buildCommercialPdf(customerQuoteDocument(current.quote, version, items), await loadPdfAssets());
    return pdfResponse(bytes, `presupuesto-${documentNumber("PP", current.quote.number)}-v${revision}.pdf`);
  } catch (error) { return pdfErrorResponse(error); }
}
