import {redirect,notFound} from "next/navigation";
import {getTeamAccess} from "@/features/auth/team-access";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {validId} from "@/features/sales/queries";
export type ProductionItem={id:string;description:string;client_description:string;technical_sheet:import("./technical-sheet").TechnicalSheet;specifications:string;quantity:number;production_status:"pending"|"completed";completion_note:string;completed_at:string|null};
export type ProductionOrder={id:string;number:number;created_at:string;customer_name:string;notes:string;items:ProductionItem[]};
export type ProductionSummary={id:string;number:number;created_at:string;customer_name:string;item_count:number;completed_count:number};
export async function requireOperator(){
 const access=await getTeamAccess();
 if(access.status!=="allowed") redirect("/acceso");
 if(!access.roles.includes("operator")) redirect("/panel");
 return access;
}
export async function getProductionOrder(id:string):Promise<ProductionOrder>{
 await requireOperator();
 if(!validId(id)) notFound();
 const db=await createSupabaseServerClient();
 const {data,error}=await db.rpc("production_order",{p_order_id:id});
 if(error) throw new Error("No pudimos cargar el trabajo.");
 if(!data) notFound();
 return data as ProductionOrder;
}
