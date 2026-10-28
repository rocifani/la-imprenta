import Link from "next/link";
import { requireDesigner, getCustomer } from "@/features/sales/queries";
import { QuoteEditor } from "@/features/sales/quote-editor";

export const metadata = { title: "Nuevo presupuesto | La Imprenta" };
export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ customer_id?: string }> }) {
  await requireDesigner();
  const { customer_id } = await searchParams;
  const existing = customer_id ? await getCustomer(customer_id) : null;
  const customer = existing ? { id: existing.id, display_name: existing.display_name, phone: existing.phone, contact_name:existing.contact_name } : null;
  return <main className="business-page"><Link className="back-link" href="/panel/presupuestos">← Presupuestos</Link><span className="eyebrow">COTIZACIÓN MANUAL</span><h1>Nuevo presupuesto.</h1><p className="muted">Describí cada trabajo y definí su precio antes de acordarlo con el cliente.</p><QuoteEditor id={crypto.randomUUID()} customer={customer} /></main>;
}
