"use server";
import {revalidatePath} from "next/cache";
import {requireBilling} from "./queries";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {validId} from "@/features/sales/queries";
import type {FormState} from "@/features/sales/types";
export async function markInvoiced(_previous:FormState,form:FormData):Promise<FormState>{
 await requireBilling();const id=String(form.get("order_id")??"");
 if(!validId(id)) return {error:"Recargá la nota antes de registrar la facturación."};
 const db=await createSupabaseServerClient();
 const {error}=await db.rpc("mark_order_invoiced",{p_order_id:id});
 if(error) return {error:["42501","P0002","23514"].includes(error.code)?error.message:"No pudimos registrar la facturación. Intentá nuevamente."};
 revalidatePath("/panel/facturacion","layout");
 revalidatePath("/panel/pedidos");revalidatePath(`/panel/pedidos/${id}`);
 revalidatePath("/panel/clientes","layout");
 return {};
}
