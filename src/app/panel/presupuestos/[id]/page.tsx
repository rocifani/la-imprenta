import Link from "next/link";
import { notFound } from "next/navigation";
import { getQuote } from "@/features/sales/queries";
import { documentNumber, formatDate, formatMoney } from "@/features/sales/money";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ItemTable } from "@/features/sales/item-table";
import { ApprovalForm } from "@/features/sales/approval-form";
import { OrderForm } from "@/features/sales/order-form";
import type { QuoteItem, QuoteVersion } from "@/features/sales/types";

export const metadata = { title: "Detalle del presupuesto | La Imprenta" };
export default async function QuotePage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ saved?: string; revision?: string }> }) {
  const current = await getQuote((await params).id);
  const options = await searchParams;
  const db = await createSupabaseServerClient();
  const revision = options.revision ? Number(options.revision) : current.quote.revision;
  if (!Number.isInteger(revision) || revision < 1 || revision > current.quote.revision) notFound();
  let version = current.version;
  let items = current.items;
  const historical = revision !== current.quote.revision;
  if (historical) {
    const { data: oldVersion, error } = await db.from("quote_versions").select("*").eq("quote_id", current.quote.id).eq("revision", revision).single();
    if (error) throw new Error("No pudimos cargar la versión anterior.");
    const { data: oldItems, error: itemsError } = await db.from("quote_items").select("description,specifications,quantity,amount").eq("version_id", oldVersion.id).order("position");
    if (itemsError) throw new Error("No pudimos cargar los productos.");
    version = oldVersion as QuoteVersion; items = oldItems as QuoteItem[];
  }
  const { data: history, error: historyError } = await db.from("quote_versions").select("revision,created_at").eq("quote_id", current.quote.id).order("revision", { ascending: false }).limit(20);
  if (historyError) throw new Error("No pudimos cargar el historial.");
  const total = items.reduce((sum, item) => sum + Math.round(Number(item.amount) * 100), 0) / 100;
  return <main className="business-page"><Link className="back-link" href="/panel/presupuestos">← Presupuestos</Link><div className="users-heading"><div><span className="eyebrow">{historical ? "VERSIÓN ANTERIOR" : current.quote.status === "approved" ? "APROBADO" : "BORRADOR"}</span><h1>{documentNumber("PP", current.quote.number)}</h1><p className="muted">Versión {revision} · {formatDate(version.created_at)}</p></div>{!historical && current.quote.status === "draft" && <Link className="button secondary" href={`/panel/presupuestos/${current.quote.id}/editar`}>Editar borrador</Link>}</div>{options.saved === "1" && <p role="status" className="success-note">Borrador guardado correctamente.</p>}{historical && <p className="setup-note">Estás viendo una versión anterior. <Link href={`/panel/presupuestos/${current.quote.id}`}>Volver a la versión actual ↗</Link></p>}<section className="business-card"><h2>{version.recipient_name}</h2>{version.customer_id && <Link className="edit-member" href={`/panel/clientes/${version.customer_id}`}>Ver ficha del cliente ↗</Link>}<p>{version.recipient_phone || "Sin teléfono indicado"}</p><ItemTable items={items} /><div className="quote-total"><span>Total final · ARS</span><strong>{formatMoney(total)}</strong></div><p className="field-help">Los importes corresponden al total de cada lote. No hay impuestos adicionales calculados por el sistema.</p>{version.notes && <p className="specification-text">{version.notes}</p>}</section>
    {!historical && current.quote.status === "draft" && <ApprovalForm quote={current.quote} />}
    {!historical && current.quote.status === "approved" && <section className="business-card"><h2>Aprobación registrada</h2><p>{current.quote.approved_at && formatDate(current.quote.approved_at)}</p>{current.quote.approval_note && <p className="specification-text">{current.quote.approval_note}</p>}</section>}
    {!historical && current.order && <Link className="button dark" href={`/panel/pedidos/${current.order.id}`}>Ver nota {documentNumber("NP", current.order.number)} ↗</Link>}
    {!historical && current.quote.status === "approved" && !current.order && <OrderForm quote={current.quote} version={version} customer={current.customer} newCustomerId={crypto.randomUUID()} />}
    <section className="business-card"><h2>Historial de versiones</h2><p className="field-help">Últimas 20 versiones guardadas. Las versiones anteriores se conservan.</p><div className="version-links">{history?.map((entry) => <Link key={entry.revision} href={`/panel/presupuestos/${current.quote.id}?revision=${entry.revision}`} aria-current={entry.revision === revision ? "page" : undefined}>Versión {entry.revision} · {formatDate(entry.created_at)}</Link>)}</div></section></main>;
}
