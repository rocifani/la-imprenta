import Link from "next/link";
import {requireDesigner,getCustomer,getOrder} from "@/features/sales/queries";
import {DirectOrderForm} from "@/features/sales/direct-order-form";
import {getProductionTeam} from "@/features/production/team";
import {documentNumber} from "@/features/sales/money";
export const metadata={title:"Nueva nota de pedido | La Imprenta"};
export default async function NewOrderPage({searchParams}:{searchParams:Promise<{customer_id?:string;duplicate_from?:string}>}){
 await requireDesigner();const options=await searchParams;
 const source=options.duplicate_from?await getOrder(options.duplicate_from):null;
 const customerId=source?.order.customer_id??options.customer_id;
 const [customer,members]=await Promise.all([customerId?getCustomer(customerId):Promise.resolve(null),getProductionTeam()]);
 return <main className="business-page"><Link className="back-link" href="/panel/pedidos">← Notas de pedido</Link><span className="eyebrow">TRABAJO CONFIRMADO</span><h1>{source?"Duplicar nota de pedido.":"Nueva nota de pedido."}</h1><p className="muted">{source?`Nueva nota a partir de ${documentNumber("NP",source.order.number)}. Revisá cantidades, precios y ficha técnica. No se copian pagos, facturación, cierres ni responsables.`:"Registrá un trabajo acordado directamente, sin presupuesto previo."}</p><DirectOrderForm id={crypto.randomUUID()} newCustomerId={crypto.randomUUID()} members={members} items={source?.items} notes={source?.order.notes} sourceOrderId={source?.order.id} customer={customer?{id:customer.id,display_name:customer.display_name,phone:customer.phone}:null}/></main>;
}
