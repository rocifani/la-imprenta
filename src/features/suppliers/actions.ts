"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {requireFinance} from "@/features/finance/queries";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {validId} from "@/features/sales/queries";
import {contactData} from "@/features/sales/contact-data";
import {moneyToCents} from "@/features/sales/money";
import type {FormState} from "@/features/sales/types";
function refresh(){for(const p of ["/panel/proveedores","/panel/clientes","/panel/finanzas","/panel/pedidos"])revalidatePath(p,"layout");}
function failure(error:{code?:string;message:string}){return {error:["22023","23514","40001","42501","P0002"].includes(error.code??"")?error.message:"No pudimos guardar. Revisá los datos e intentá nuevamente."};}
export async function saveSupplier(_previous:FormState,form:FormData):Promise<FormState>{
 await requireFinance();const id=String(form.get("id")??""),v=String(form.get("version")??"");if(!validId(id)||(v&&!/^\d+$/.test(v))||(v&&!Number.isSafeInteger(Number(v))))return {error:"Recargá el formulario."};
 const db=await createSupabaseServerClient();const {error}=await db.rpc("save_supplier",{p_id:id,p_version:v?Number(v):null,p_data:contactData(form)});if(error)return failure(error);refresh();redirect(form.get("is_supplier")==="on"?`/panel/proveedores/${id}?saved=1`:"/panel/proveedores");
}
export async function enableSupplier(_previous:FormState,form:FormData):Promise<FormState>{await requireFinance();const id=String(form.get("contact_id")??"");if(!validId(id))return {error:"Elegí un contacto existente."};const db=await createSupabaseServerClient();const {error}=await db.rpc("enable_supplier",{p_id:id});if(error)return failure(error);refresh();redirect(`/panel/proveedores/${id}?saved=1`);}
export async function recordPurchase(_previous:FormState,form:FormData):Promise<FormState>{
 await requireFinance();const id=String(form.get("id")??""),supplier=String(form.get("supplier_id")??""),amount=moneyToCents(String(form.get("amount")??""));if(!validId(id)||!validId(supplier)||amount===null)return {error:"Revisá proveedor e importe de la compra."};
 let payment=null;if(form.get("pay_now")==="on"){const cents=moneyToCents(String(form.get("payment_amount")??""));if(cents===null||cents>amount)return {error:"El pago debe ser mayor a cero y no superar el importe de la compra."};payment={amount:(cents/100).toFixed(2),paid_on:String(form.get("payment_paid_on")??""),method:String(form.get("payment_method")??"")};}
 const db=await createSupabaseServerClient();const {error}=await db.rpc("record_supplier_purchase",{p_id:id,p_supplier_id:supplier,p_amount:(amount/100).toFixed(2),p_purchased_on:String(form.get("purchased_on")??""),p_description:String(form.get("description")??"").trim(),p_reference:String(form.get("reference")??"").trim(),p_payment:payment});if(error)return failure(error);refresh();redirect(`/panel/proveedores/${supplier}?saved=1`);
}
