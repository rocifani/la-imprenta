import Link from "next/link";
import { CustomerPaymentForm } from "@/features/finance/customer-payment-form";
import { getFinanceCustomerAccount, requireFinance } from "@/features/finance/queries";
export const metadata = { title: "Cobro por cliente | La Imprenta" };

export default async function NewCustomerPaymentPage({ searchParams }: { searchParams: Promise<{ customer_id?: string }> }) {
  await requireFinance();
  const { customer_id } = await searchParams;
  const account = customer_id ? await getFinanceCustomerAccount(customer_id) : null;
  return <main className="business-page">
    <Link className="back-link" href="/panel/finanzas/pedidos">← Cobros y saldos</Link>
    <h1>Registrar cobro por cliente</h1>
    <p className="muted">El importe se descuenta desde la nota más antigua con saldo. El excedente queda disponible para sus próximos pedidos.</p>
    <section className="business-card"><CustomerPaymentForm id={crypto.randomUUID()} initialAccount={account} /></section>
  </main>;
}
