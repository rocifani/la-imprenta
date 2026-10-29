import type {OrderItem} from "./types";
export function orderEditBlock(items:Pick<OrderItem,"production_status">[],paid:number):string|null{
 if(paid>0)return "Esta nota tiene cobros registrados, incluida cualquier seña. No se puede editar ni eliminar.";
 if(items.some(item=>item.production_status==="completed"))return "Esta nota tiene ítems terminados. No se puede editar ni eliminar.";
 return null;
}
