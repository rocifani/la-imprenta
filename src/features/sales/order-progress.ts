type ItemState={production_status:"pending"|"completed"};
export function orderProgress(items:ItemState[],invoiced=false){
 const total=items.length;
 const completed=items.filter(item=>item.production_status==="completed").length;
 const productionLabel=total>0&&completed===total?"Terminada":completed>0?"Parcialmente terminada":"Confirmada";
 return {total,completed,productionLabel,label:invoiced?"Facturada":productionLabel};
}
