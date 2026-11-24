import type {Customer} from "@/features/sales/types";
import type {CustomerStatement} from "@/features/sales/completed-summary";
export type SupplierPurchase={id:string;number:number;purchased_on:string;amount:number;description:string;reference:string;balance:number;paid:number;settled:number;offsets:{order_number:number;amount:number}[]};
export type SupplierAccount={contact:Customer;account:CustomerStatement;advance:number;purchase_balance:number;purchase_count:number;purchases:SupplierPurchase[]};
