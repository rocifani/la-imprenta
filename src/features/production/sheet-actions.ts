"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireDesigner,validId} from "@/features/sales/queries";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {readOrderHeader} from "./order-header";
import {validTechnicalSheet} from "./technical-sheet";
import type {FormState} from "@/features/sales/types";
export async function saveOrderSheet(_previous:FormState,form:FormData):Promise<FormState>{
 await requireDesigner();const id=String(form.get("order_id")??"");const revision=Number(form.get("revision"));
 if(!validId(id)||!Number.isSafeInteger(revision)||revision<1)return {error:"Recargá la ficha antes de guardar."};
 let source:unknown;try{source=JSON.parse(String(form.get("items")??"[]"))}catch{return {error:"Revisá los trabajos."}}
 if(!Array.isArray(source)||source.length<1||source.length>50)return {error:"Revisá los trabajos."};
 const items=[];
 for(const item of source){
  if(!item||typeof item!=="object"||!validId(String(item.id??""))||typeof item.client_description!=="string"||item.client_description.trim().length<2||item.client_description.length>1000||typeof item.specifications!=="string"||item.specifications.length>2000||!validTechnicalSheet(item.technical_sheet))return {error:"Revisá las descripciones y las fichas técnicas."};
  items.push({id:item.id,client_description:item.client_description.trim(),specifications:item.specifications,technical_sheet:item.technical_sheet});
 }
 const header=readOrderHeader(form);if("error" in header)return header;
 const db=await createSupabaseServerClient();const {error}=await db.rpc("save_order_work_details",{p_order_id:id,p_revision:revision,p_items:items,p_description:header.description,p_technical_sheet:header.sheet});
 if(error)return {error:["22023","40001","42501","P0002"].includes(error.code)?error.message:"No pudimos guardar la ficha."};
 revalidatePath(`/panel/pedidos/${id}`);revalidatePath(`/panel/produccion/${id}`);revalidatePath("/panel/clientes","layout");
 redirect(`/panel/pedidos/${id}?sheet_saved=1`);
}
