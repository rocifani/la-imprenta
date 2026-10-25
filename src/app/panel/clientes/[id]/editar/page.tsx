import Link from "next/link";
import { getCustomer } from "@/features/sales/queries";
import { CustomerForm } from "@/features/sales/customer-form";

export const metadata = { title: "Editar cliente | La Imprenta" };
export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const customer = await getCustomer((await params).id);
  return <main className="member-page"><Link className="back-link" href={`/panel/clientes/${customer.id}`}>← Ficha del cliente</Link><h1>Editar cliente.</h1><p className="muted">Los pedidos anteriores conservarán los datos con los que fueron creados.</p><CustomerForm id={customer.id} customer={customer} /></main>;
}
