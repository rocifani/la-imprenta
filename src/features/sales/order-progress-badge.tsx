import {orderProgress} from "./order-progress";
export function OrderProgressBadge({items,invoiced}:{items:Parameters<typeof orderProgress>[0];invoiced:boolean}){
 const state=orderProgress(items,invoiced);
 return <div className="order-progress"><span className={`status-badge ${state.label==="Terminada"||invoiced?"active":"inactive"}`}>{state.label}</span><span className="field-help">{state.completed} de {state.total} trabajos terminados{invoiced?` · ${state.productionLabel}`:""}</span><progress max={Math.max(1,state.total)} value={state.completed} aria-label={`Avance de producción: ${state.completed} de ${state.total} trabajos terminados`}/></div>;
}
