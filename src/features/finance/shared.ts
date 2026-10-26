export function argentinaToday(){return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Argentina/Buenos_Aires",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());}
export const methodLabels:Record<string,string>={cash:"Efectivo",transfer:"Transferencia",card:"Tarjeta",other:"Otro"};
export type OrderMoney={total:number;paid:number;deposit:number;balance:number;overdue:boolean};
export type FinanceOrder={id:string;number:number;created_at:string;customer_name:string;total:number;paid:number;balance:number;overdue:boolean};
export type Movement={id:string;kind:"deposit"|"payment"|"expense";order_id:string|null;order_number?:number;customer_name?:string;amount:number;paid_on:string;method:string;description:string};
export type MonthData={income:number;expenses:number;net:number;total:number;movements:Movement[]};
