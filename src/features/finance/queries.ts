import {redirect,notFound} from "next/navigation";
import {getTeamAccess} from "@/features/auth/team-access";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {validId} from "@/features/sales/queries";
import type {FinanceOrder,Movement} from "./shared";
export async function requireFinance(){const access=await getTeamAccess();if(access.status!=="allowed")redirect("/acceso");if(!access.roles.includes("finance"))redirect("/panel");return access;}
export async function getFinanceOrder(id:string){
 await requireFinance();if(!validId(id))notFound();const db=await createSupabaseServerClient();
 const [{data,error},{data:receipts,error:receiptError}]=await Promise.all([db.rpc("finance_orders",{p_status:"all",p_id:id}),db.rpc("finance_receipts",{p_order_id:id})]);
 if(error||receiptError)throw new Error("No pudimos cargar los cobros.");
 if(!data.orders.length)notFound();return {order:data.orders[0] as FinanceOrder,receipts:receipts as Movement[]};
}
