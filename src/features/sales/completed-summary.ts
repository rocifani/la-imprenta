export type CompletedCustomerSummary={generated_at:string;customer:{id:string;name:string;cuit:string;phone:string;email:string;address:string};balance:number;orders:{id:string;number:number;created_at:string;total:number;paid:number;balance:number;completed_total:number;items:{description:string;quantity:number;amount:number}[]}[]};
// No se pasa el objeto original al PDF: selección explícita de datos comerciales.
export function completedSummaryDocument(summary:CompletedCustomerSummary){
 const orders=summary.orders.filter(order=>Number(order.balance)!==0).sort((a,b)=>a.number-b.number);
 return {generated_at:summary.generated_at,customer:{name:summary.customer.name,cuit:summary.customer.cuit,phone:summary.customer.phone,email:summary.customer.email,address:summary.customer.address},balance:orders.reduce((sum,order)=>sum+Math.round(Number(order.balance)*100),0)/100,
 orders:orders.map(order=>({number:order.number,created_at:order.created_at,total:order.total,paid:order.paid,balance:order.balance,completed_total:order.completed_total,items:order.items.map(item=>({description:item.description,quantity:item.quantity,amount:item.amount}))}))};
}
export type CompletedSummaryDocument=ReturnType<typeof completedSummaryDocument>;
