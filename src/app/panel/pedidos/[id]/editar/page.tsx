import Link from "next/link";
import {getOrder,getOrderDeposit} from "@/features/sales/queries";
import {EditOrderForm} from "@/features/sales/edit-order-form";
import {orderEditBlock} from "@/features/sales/order-edit-policy";
import {documentNumber} from "@/features/sales/money";
export const metadata={title:"Editar nota de pedido | La Imprenta"};
export default async function EditOrderPage({params}:{params:Promise<{id:string}>}){
 const {order,items,money}=await getOrder((await params).id);
 const deposit=await getOrderDeposit(order.id);
 const blocked=orderEditBlock(items,Number(money.paid),Number(money.deposit));
 return <main className="business-page"><Link className="back-link" href={"/panel/pedidos/"+order.id}>← Nota de pedido</Link><h1>Editar {documentNumber("NP",order.number)}</h1>{blocked?<p className="form-alert" role="status">{blocked}</p>:<><p className="muted">Modificá cantidades, precios y detalles, o agregá y quitá ítems. Solo se permite mientras no haya cobros adicionales a la seña ni ítems terminados.</p><EditOrderForm order={order} items={items} deposit={deposit}/></>}</main>;
}
