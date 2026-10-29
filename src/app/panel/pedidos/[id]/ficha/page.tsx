import Link from "next/link";
import {getOrder} from "@/features/sales/queries";
import {OrderSheetEditor} from "@/features/production/order-sheet-editor";
import {documentNumber} from "@/features/sales/money";
export const metadata={title:"Ficha de producción | La Imprenta"};
export default async function EditSheetPage({params}:{params:Promise<{id:string}>}){
 const {order,items}=await getOrder((await params).id);
 return <main className="business-page"><Link href={`/panel/pedidos/${order.id}`} className="back-link">← Nota de pedido</Link><span className="eyebrow">DESCRIPCIÓN Y PRODUCCIÓN</span><h1>Ficha {documentNumber("NP",order.number)}</h1><p className="muted">La descripción simple se envía al cliente. La ficha técnica y las indicaciones son para el taller. Precios, cantidades, cobros y cierres se conservan.</p><OrderSheetEditor orderId={order.id} revision={order.production_revision??1} items={items} description={order.work_description} sheet={order.technical_sheet}/></main>;
}
