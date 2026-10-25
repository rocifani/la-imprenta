import Link from "next/link";
import { redirect } from "next/navigation";
import { getQuote } from "@/features/sales/queries";
import { QuoteEditor } from "@/features/sales/quote-editor";
import { documentNumber } from "@/features/sales/money";

export const metadata = { title: "Editar presupuesto | La Imprenta" };
export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const { quote, version, items, customer } = await getQuote((await params).id);
  if (quote.status !== "draft") redirect(`/panel/presupuestos/${quote.id}`);
  return <main className="business-page"><Link className="back-link" href={`/panel/presupuestos/${quote.id}`}>← Volver al presupuesto</Link><h1>Editar {documentNumber("PP", quote.number)}.</h1><p className="muted">Al guardar se conserva una nueva versión del borrador.</p><QuoteEditor id={quote.id} quote={quote} version={version} items={items} customer={customer} /></main>;
}
