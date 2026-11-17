import Link from "next/link";
import { PagedSection } from "@/components/paged-section";
import { getCustomerPayment } from "@/features/finance/queries";
import { methodLabels } from "@/features/finance/shared";
import { documentNumber, formatDate, formatMoney } from "@/features/sales/money";
import { splitPages } from "@/features/sales/list-controls";
export const metadata = { title: "Distribución del cobro | La Imprenta" };

export default async function CustomerPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const payment = await getCustomerPayment((await params).id);
  return <main className="business-page">
    <Link className="back-link" href={"/panel/finanzas/pedidos?customer_id=" + payment.customer_id}>← Cobros y saldos del cliente</Link>
    <h1>Cobro de {payment.customer_name}</h1>
    <section className="business-card">
      <dl className="data-grid">
        <div><dt>Importe recibido</dt><dd>{formatMoney(payment.amount)}</dd></div>
        <div><dt>Fecha del cobro</dt><dd>{formatDate(payment.paid_on + "T12:00:00Z")}</dd></div>
        <div><dt>Medio de pago</dt><dd>{methodLabels[payment.method]}</dd></div>
        <div><dt>Saldo a favor disponible de este cobro</dt><dd>{formatMoney(payment.credit_remaining)}</dd></div>
      </dl>
      {payment.description && <p className="specification-text">{payment.description}</p>}
      <h2>Importes aplicados por nota</h2>
      {payment.allocations.length ? <PagedSection label="Aplicaciones del cobro" pages={splitPages(payment.allocations).map((rows, index) => <ul key={index}>
        {rows.map((row, i) => <li key={row.order_id + i}>
          <Link href={"/panel/finanzas/pedidos/" + row.order_id}>{documentNumber("NP", row.number)}</Link> · {formatMoney(row.amount)}
          {row.kind === "credit_application" && " · Saldo a favor aplicado"}
        </li>)}
      </ul>)} /> : <p>El cobro quedó íntegramente como saldo a favor.</p>}
    </section>
  </main>;
}
