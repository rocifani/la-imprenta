"use client";
import {useActionState} from "react";
import {ConfirmedForm} from "@/components/confirmed-form";
import {completeProduction} from "./actions";

export function CompletionForm({orderId,itemId}:{orderId:string;itemId?:string}){
 const [state,action,pending]=useActionState(completeProduction,{});
 return <ConfirmedForm action={action} pending={pending} className="production-close"
  title={itemId?"¿Marcar este trabajo como terminado?":"¿Marcar la nota completa como terminada?"}
  description={itemId?"Se guardará como terminado junto con tu comentario, si lo escribiste.":"Se marcarán como terminados todos los trabajos restantes. Los ya terminados conservarán sus comentarios."}>
  <input type="hidden" name="order_id" value={orderId}/>{itemId&&<input type="hidden" name="item_id" value={itemId}/>}
  {state.error&&<p role="alert" className="form-alert">{state.error}</p>}
  <fieldset className="form-fields" disabled={pending}>
   <label>Comentario al terminar (opcional)<textarea name="note" rows={2} maxLength={2000} placeholder="Aclaraciones sobre cómo se terminó el trabajo."/></label>
   <button className="button dark">{pending?"Guardando…":itemId?"Marcar trabajo como terminado":"Marcar nota completa como terminada"}</button>
  </fieldset>
 </ConfirmedForm>;
}
