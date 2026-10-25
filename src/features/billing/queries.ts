import {redirect,notFound} from "next/navigation";
import {getTeamAccess} from "@/features/auth/team-access";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {validId} from "@/features/sales/queries";
import type {OrderItem} from "@/features/sales/types";
export type BillingOrder={id:string;number:number;created_at:string;total:number|string;invoiced:boolean;invoiced_at:string|null;invoiced_by_name:string|null;customer:{name:string;cuit:string|null;address:string;contact:string;phone:string;email:string};items:OrderItem[]};
export type BillingSummary=Pick<BillingOrder,"id"|"number"|"created_at"|"total"|"invoiced"|"invoiced_at">&{customer_name:string;item_count:number;completed_count:number};
export async function requireBilling(){
 const access=await getTeamAccess();
 if(access.status!=="allowed") redirect("/acceso");
 if(!access.roles.includes("billing")) redirect("/panel");
 return access;
}
export async function getBillingOrder(id:string):Promise<BillingOrder>{
 await requireBilling();if(!validId(id)) notFound();
 const db=await createSupabaseServerClient();
 const {data,error}=await db.rpc("billing_order",{p_order_id:id});
 if(error) throw new Error("No pudimos cargar los datos de facturación.");
 if(!data) notFound();return data as BillingOrder;
}
