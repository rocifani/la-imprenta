import Link from "next/link";
import { requireDesigner } from "@/features/sales/queries";
import { CustomerForm } from "@/features/sales/customer-form";

export const metadata = { title: "Nuevo cliente | La Imprenta" };
export default async function NewCustomerPage() {
  await requireDesigner();
  return <main className="member-page"><Link className="back-link" href="/panel/clientes">← Clientes</Link><span className="eyebrow">NUEVA FICHA</span><h1>Dar de alta un cliente.</h1><p className="muted">Es una ficha interna. El cliente no recibe una cuenta de acceso.</p><CustomerForm id={crypto.randomUUID()} /></main>;
}
