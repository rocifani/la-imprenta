"use server";
import {revalidatePath} from "next/cache";
import {requireOperator} from "./queries";
import {validId} from "@/features/sales/queries";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import type {FormState} from "@/features/sales/types";
export async function completeProduction(_previous:FormState,form:FormData):Promise<FormState>{
 await requireOperator();
 const orderId=String(form.get("order_id")??"");
 const itemId=String(form.get("item_id")??"");
 const note=String(form.get("note")??"").trim();
 if(!validId(orderId)||(itemId&&!validId(itemId))) return {error:"Recargá el trabajo antes de cerrarlo."};
 if(note.length>2000) return {error:"El comentario admite hasta 2000 caracteres."};
 const db=await createSupabaseServerClient();
 const {error}=await db.rpc("complete_production",{p_order_id:orderId,p_item_id:itemId||null,p_note:note});
 if(error) return {error:["42501","P0002","22023"].includes(error.code)?error.message:"No pudimos cerrar el trabajo. Intentá nuevamente."};
 revalidatePath("/panel/produccion","layout");
 revalidatePath("/panel/pedidos");
 revalidatePath(`/panel/pedidos/${orderId}`);
 return {};
}
