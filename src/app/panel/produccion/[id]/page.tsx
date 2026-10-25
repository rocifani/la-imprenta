import Link from "next/link";
import {getProductionOrder} from "@/features/production/queries";
import {CompletionForm} from "@/features/production/completion-form";
import {documentNumber,formatDate} from "@/features/sales/money";
export const metadata={title:"Trabajo en producción | La Imprenta"};
export default async function ProductionOrderPage({params}:{params:Promise<{id:string}>}){
 const order=await getProductionOrder((await params).id);
 const remaining=order.items.filter(item=>item.production_status!=="completed").length;
 return <main className="business-page"><Link href="/panel/produccion" className="back-link">← Producción</Link><span className="eyebrow">ORDEN DE TRABAJO</span><h1>{documentNumber("NP",order.number)}</h1><p>{order.customer_name} · {formatDate(order.created_at)}</p><p className="setup-note" role="status">{remaining?`Quedan ${remaining} trabajos por terminar.`:"Todos los trabajos están terminados."}</p>
 {order.notes&&<section className="business-card"><h2>Observaciones del pedido</h2><p className="specification-text">{order.notes}</p></section>}
 {order.items.map((item,index)=><section className="business-card" key={item.id}><div className="card-title-row"><h2>{index+1}. {item.description}</h2><span className="pill">{item.production_status==="completed"?"Terminado":"Pendiente"}</span></div><p>Cantidad: {item.quantity.toLocaleString("es-AR")}</p><p className="specification-text">{item.specifications||"Sin características adicionales."}</p>{item.production_status==="completed"?<><p className="field-help">Terminado{item.completed_at?` el ${formatDate(item.completed_at)}`:""}.</p>{item.completion_note&&<p className="specification-text"><strong>Comentario del operario:</strong>{" "}{item.completion_note}</p>}</>:<><CompletionForm orderId={order.id} itemId={item.id}/></>}</section>)}
 {remaining>0&&<section className="business-card"><h2>Terminar la nota completa</h2><p className="field-help">El comentario se guarda en cada trabajo restante. Los trabajos ya terminados conservan sus comentarios.</p><CompletionForm orderId={order.id}/></section>}
 </main>;
}
