import type {OrderItem} from "./types";
type ItemStatus=Pick<OrderItem,"production_status">;
export function orderEditBlock(items:ItemStatus[],paid:number,deposit=0,invoiced=false):string|null{
 if(invoiced)return "Esta nota tiene facturación registrada. No se puede editar ni eliminar.";
 if(paid>deposit)return "Esta nota tiene cobros adicionales a la seña. No se puede editar.";
 if(items.some(item=>item.production_status==="completed"))return "Esta nota tiene ítems terminados. No se puede editar ni eliminar.";
 return null;
}
export function orderDeleteBlock(items:ItemStatus[],paid:number,invoiced=false):string|null{
 if(paid>0)return "Esta nota tiene cobros registrados, incluida la seña. No se puede eliminar.";
 return orderEditBlock(items,0,0,invoiced);
}
