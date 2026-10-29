import Link from "next/link";
import {getOrder} from "@/features/sales/queries";
import {EditOrderForm} from "@/features/sales/edit-order-form";
import {orderEditBlock} from "@/features/sales/order-edit-policy";
import {documentNumber} from "@/features/sales/money";
export const metadata={title:"Editar nota de pedido | La Imprenta"};
export default async function EditOrderPage({params}:{params:Promise<{id:string}>}){
 const {order,items,money}=await getOrder((await params).id);
 const blocked=orderEditBlock(items,Number(money.paid));
 return <main className="business-page"><Link className="back-link" href={"/panel/pedidos/"+order.id}>← Nota de pedido</Link><h1>Editar {documentNumber("NP",order.number)}</h1>{blocked?<p className="form-alert" role="status">{blocked}</p>:<><p className="muted">Modificá cantidades, precios y detalles, o agregá y quitá ítems. Solo se permite mientras no haya cobros ni ítems terminados.</p><EditOrderForm order={order} items={items}/></>}</main>;
}
