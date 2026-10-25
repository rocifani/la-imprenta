import Link from "next/link";
import {requireDesigner,getCustomer} from "@/features/sales/queries";
import {DirectOrderForm} from "@/features/sales/direct-order-form";
export const metadata={title:"Nueva nota de pedido | La Imprenta"};
export default async function NewOrderPage({searchParams}:{searchParams:Promise<{customer_id?:string}>}) {
 await requireDesigner();
 const {customer_id}=await searchParams;
 const customer=customer_id?await getCustomer(customer_id):null;
 return <main className="business-page"><Link className="back-link" href="/panel/pedidos">← Notas de pedido</Link><span className="eyebrow">TRABAJO CONFIRMADO</span><h1>Nueva nota de pedido.</h1><p className="muted">Registrá un trabajo acordado directamente, sin presupuesto previo.</p><DirectOrderForm id={crypto.randomUUID()} newCustomerId={crypto.randomUUID()} customer={customer?{id:customer.id,display_name:customer.display_name,phone:customer.phone}:null}/></main>;
}
