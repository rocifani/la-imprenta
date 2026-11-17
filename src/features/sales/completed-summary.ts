export type CustomerStatement={debit:number;credit:number;balance:number;entries:{date:string;description?:string;kind:string;number:number|null;debit:number;credit:number;method:string|null;balance:number;allocations:{number:number;amount:number}[]}[]};
export type SummaryPayment={date:string;amount:number;method:string;kind:string};
export type CompletedCustomerSummary={generated_at:string;credit?:number;account?:CustomerStatement;customer:{id:string;name:string;cuit:string;phone:string;email:string;address:string};balance:number;orders:{id:string;number:number;created_at:string;total:number;paid:number;balance:number;completed_total:number;payments?:SummaryPayment[];items:{description:string;quantity:number;amount:number}[]}[]};
// No se pasa el objeto original al PDF: selección explícita de datos comerciales.
export function completedSummaryDocument(summary:CompletedCustomerSummary){
 const orders=summary.orders.filter(order=>Number(order.balance)!==0).sort((a,b)=>a.number-b.number);
 return {account:summary.account?{debit:summary.account.debit,credit:summary.account.credit,balance:summary.account.balance,entries:summary.account.entries.map(e=>({date:e.date,description:e.description,kind:e.kind,number:e.number,debit:e.debit,credit:e.credit,method:e.method,balance:e.balance,allocations:e.allocations.map(a=>({number:a.number,amount:a.amount}))}))}:undefined,credit:summary.credit ?? 0,generated_at:summary.generated_at,customer:{name:summary.customer.name,cuit:summary.customer.cuit,phone:summary.customer.phone,email:summary.customer.email,address:summary.customer.address},balance:orders.reduce((sum,order)=>sum+Math.round(Number(order.balance)*100),0)/100,
 orders:orders.map(order=>({number:order.number,created_at:order.created_at,total:order.total,paid:order.paid,balance:order.balance,completed_total:order.completed_total,payments:(order.payments??[]).map(p=>({date:p.date,amount:p.amount,method:p.method,kind:p.kind})),items:order.items.map(item=>({description:item.description,quantity:item.quantity,amount:item.amount}))}))};
}
export type CompletedSummaryDocument=ReturnType<typeof completedSummaryDocument>;

// Conciliación entre el resumen parcial de trabajos y la cuenta completa.
export function summaryBalances(summary:{balance:number;credit?:number;account?:CustomerStatement}){
 const included=Math.round(summary.balance*100);
 const credit=Math.round((summary.credit??0)*100);
 const total=summary.account?Math.round(summary.account.balance*100):included-credit;
 return {included:included/100,other:(total+credit-included)/100,credit:credit/100,total:total/100};
}
