"use client";
import {useActionState} from "react";
import {ConfirmedForm} from "@/components/confirmed-form";
import {transferProduction} from "./actions";
import type {ProductionOrder} from "./queries";
import type {ProductionMember} from "./team";
export function AssignmentPanel({order,members}:{order:ProductionOrder;members:ProductionMember[]}){
 const [state,action,pending]=useActionState(transferProduction,{});const closed=order.items.every(item=>item.production_status==="completed");
 const candidates=members.filter(member=>member.id!==order.assigned_to);
 return <section className="business-card"><h2>Responsable y pases</h2><p>Responsable actual: <strong>{order.assignee_name??"Sin asignar"}</strong></p>
 {!closed&&<ConfirmedForm action={action} pending={pending} title="¿Pasar esta nota a otro responsable?" description="Se registrarán el responsable anterior, el nuevo, tu usuario y la indicación del pase."><input type="hidden" name="order_id" value={order.id}/><input type="hidden" name="revision" value={order.assignment_revision}/>{state.error&&<p className="form-alert" role="alert">{state.error}</p>}<fieldset className="form-fields" disabled={pending||!candidates.length}><label>Pasar a<select name="to" required defaultValue=""><option value="">Elegí una persona de Producción</option>{candidates.map(member=><option key={member.id} value={member.id}>{member.display_name}</option>)}</select></label><label>Indicación para el siguiente responsable<textarea name="note" required minLength={3} maxLength={1000} rows={3} placeholder="Ej.: Impresión lista. Falta cortar y armar los blocks."/></label><button className="button dark">{pending?"Guardando…":"Registrar pase"}</button></fieldset>{!candidates.length&&<p className="field-help">No hay otro usuario activo con rol Producción para recibir esta nota.</p>}</ConfirmedForm>}
 <h3>Historial</h3>{order.handoffs.length?<ol className="handoff-list">{order.handoffs.map(h=><li key={h.id}><strong>{h.from_name??"Sin asignar"} → {h.to_name}</strong><span className="member-email">{new Intl.DateTimeFormat("es-AR",{timeZone:"America/Argentina/Buenos_Aires",dateStyle:"short",timeStyle:"short"}).format(new Date(h.created_at))} · {h.actor_name}</span><p className="specification-text">{h.note}</p></li>)}</ol>:<p className="field-help">Todavía no se registraron asignaciones o pases.</p>}</section>;
}
