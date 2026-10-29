"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireDesigner, validId } from "./queries";
import {readOrderHeader} from "@/features/production/order-header";
import {validTechnicalSheet} from "@/features/production/technical-sheet";
import { moneyToCents } from "./money";
import type { FormState } from "./types";

function mutationError(error: { code?: string; message: string }): FormState {
  return { error: ["22023", "23514", "40001", "P0002", "42501"].includes(error.code ?? "") ? error.message : "No pudimos guardar. Intentá nuevamente." };
}

function readVersion(form: FormData) {
  const value = String(form.get("version") ?? "");
  if (!value) return null;
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) return undefined;
  return Number(value);
}

function customerData(form: FormData) {
  return Object.fromEntries(["display_name", "contact_name", "phone", "email", "address", "cuit", "notes"].map((key) => [key, String(form.get(key) ?? "").trim()]));
}

export async function saveCustomer(_previous: FormState, form: FormData): Promise<FormState> {
  await requireDesigner();
  const id = String(form.get("id") ?? "");
  const version = readVersion(form);
  if (!validId(id) || version === undefined) return { error: "Recargá el formulario antes de guardar." };
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("save_customer", { p_id: id, p_version: version, p_data: customerData(form) });
  if (error) return mutationError(error);
  revalidatePath("/panel/clientes", "layout");
  revalidatePath(`/panel/clientes/${id}`);
  redirect(`/panel/clientes/${id}?saved=1`);
}

function readItems(form: FormData, preserveIds=false) {
  let source: unknown;
  try { source = JSON.parse(String(form.get("items") ?? "[]")); } catch { return { error: "Revisá los trabajos." }; }
  if (!Array.isArray(source) || source.length < 1 || source.length > 50) return { error: "Agregá entre 1 y 50 trabajos." };
  const items = [];
  for (const item of source) {
    if (!item || typeof item !== "object") return { error: "Revisá los trabajos." };
    const cents = moneyToCents(String(item.amount ?? ""));
    if (cents === null || !/^\d{1,8}$/.test(String(item.quantity)) || Number(item.quantity) < 1 || Number(item.quantity) > 10000000) {
      return { error: "Cada trabajo necesita una cantidad y un precio total mayores a cero, con hasta dos decimales." };
    }
    const clientDescription=String(item.client_description??item.description??"").trim();
    const sheet=item.technical_sheet??{};
    if(clientDescription.length<2||clientDescription.length>1000||!validTechnicalSheet(sheet))return {error:"Revisá la descripción para el cliente y la ficha técnica del trabajo."};
    if(preserveIds&&item.id!=null&&!validId(String(item.id)))return {error:"Recargá la nota antes de guardar los ítems."};
    items.push({ ...(preserveIds?{id:item.id??null}:{}),client_description:clientDescription,technical_sheet:sheet,description: String(item.description ?? "").trim(), specifications: String(item.specifications ?? "").trim(), quantity: Number(item.quantity), amount: (cents / 100).toFixed(2) });
  }
  return {items};
}

export async function saveQuote(_previous: FormState, form: FormData): Promise<FormState> {
  await requireDesigner();
  const id = String(form.get("id") ?? "");
  const version = readVersion(form);
  const customerId = String(form.get("customer_id") ?? "");
  if (customerId && !validId(customerId)) return { error: "Seleccioná un cliente válido." };
  if (!validId(id) || version === undefined) return { error: "Recargá el formulario antes de guardar." };
  let alternatives: {name:string;items:unknown[]}[]|null=null;
  if(form.has("alternatives")){
   let raw:unknown;try{raw=JSON.parse(String(form.get("alternatives")))}catch{return {error:"Revisá las alternativas."}}
   if(!Array.isArray(raw)||raw.length<1||raw.length>10)return {error:"Agregá entre 1 y 10 alternativas."};
   alternatives=[];let count=0;
   for(const option of raw){
    if(!option||typeof option.name!=="string"||option.name.trim().length<2||option.name.length>120)return {error:"Cada alternativa necesita un nombre."};
    const input=new FormData();input.set("items",JSON.stringify(option.items));const parsed=readItems(input);if("error" in parsed)return parsed;
    count+=parsed.items.length;alternatives.push({name:option.name.trim(),items:parsed.items});
   }
   if(count>50)return {error:"Hasta 50 trabajos entre todas las alternativas."};
  }
  const parsed=alternatives?{items:alternatives[0].items}:readItems(form);if("error" in parsed)return parsed;
  const items=parsed.items;
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("save_quote", {
    p_id: id, p_version: version, p_name: String(form.get("recipient_name") ?? "").trim(),
    p_phone: String(form.get("recipient_phone") ?? "").trim(), p_notes: String(form.get("notes") ?? "").trim(), p_items: items, p_customer_id: customerId || null,p_contact:String(form.get("recipient_contact")??"").trim(),p_alternatives:alternatives,
  });
  if (error) return mutationError(error);
  revalidatePath("/panel/presupuestos");
  revalidatePath(`/panel/presupuestos/${id}`);
  redirect(`/panel/presupuestos/${id}?saved=1`);
}

export async function approveQuote(_previous: FormState, form: FormData): Promise<FormState> {
  await requireDesigner();
  const id = String(form.get("id") ?? "");
  const version = readVersion(form);
  if (!validId(id) || version == null) return { error: "Recargá el presupuesto antes de aprobar." };
  if (form.get("confirmed") !== "on") return { error: "Confirmá primero la aprobación del cliente." };
  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("approve_quote", { p_id: id, p_version: version, p_note: String(form.get("approval_note") ?? "").trim(),p_alternative_id:String(form.get("alternative_id")??"")||null });
  if (error) return mutationError(error);
  revalidatePath("/panel/presupuestos");
  redirect(`/panel/presupuestos/${id}`);
}

function readDeposit(form:FormData){
 const raw=String(form.get("deposit_amount")??"").trim();
 if(!raw) return {deposit:null};
 const cents=moneyToCents(raw);
 if(cents===null) return {error:"Ingresá una seña mayor a cero, o dejá el campo vacío si no cobraste."};
 return {deposit:{amount:(cents/100).toFixed(2),paid_on:String(form.get("deposit_paid_on")??""),method:String(form.get("deposit_method")??"")}};
}

export async function createOrder(_previous: FormState, form: FormData): Promise<FormState> {
  await requireDesigner();
  const id = String(form.get("id") ?? "");
  const version = readVersion(form);
  const customerId = String(form.get("customer_id") ?? "");
  const newCustomerId = String(form.get("new_customer_id") ?? "");
  if (!validId(id) || version == null || (customerId && !validId(customerId)) || !validId(newCustomerId)) return { error: "Recargá el formulario antes de generar la nota." };
 const assigneeId=String(form.get("assignee_id")??"");if(assigneeId&&!validId(assigneeId))return {error:"Elegí un responsable válido."};
 const header=readOrderHeader(form);if("error" in header)return header;
 const depositData=readDeposit(form); if("error" in depositData) return depositData;
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("create_order_from_quote", {
    p_quote_id: id, p_version: version, p_customer_id: customerId || null,
    p_new_customer: customerId ? null : customerData(form), p_new_customer_id: newCustomerId, p_deposit:depositData.deposit,p_assignee_id:assigneeId||null,p_description:header.description,p_technical_sheet:header.sheet,
  });
  if (error) return mutationError(error);
  revalidatePath("/panel/clientes", "layout");
  revalidatePath("/panel/pedidos"); revalidatePath("/panel/finanzas","layout");
  revalidatePath(`/panel/presupuestos/${id}`);
  redirect(`/panel/pedidos/${data}`);
}

export async function createDirectOrder(_previous:FormState, form:FormData):Promise<FormState> {
 await requireDesigner();
 const id=String(form.get("id")??"");
 const customerId=String(form.get("customer_id")??"");
 const newCustomerId=String(form.get("new_customer_id")??"");
 if (!validId(id) || !validId(newCustomerId) || (customerId && !validId(customerId))) return {error:"Recargá el formulario antes de crear la nota."};
 if(form.get("confirmed")!=="on") return {error:"Confirmá que el trabajo fue acordado con el cliente."};
 const parsed=readItems(form); if("error" in parsed) return parsed;
 const sourceId=String(form.get("source_order_id")??"");if(sourceId&&!validId(sourceId))return {error:"La nota de origen no es válida."};
 const assigneeId=String(form.get("assignee_id")??"");if(assigneeId&&!validId(assigneeId))return {error:"Elegí un responsable válido."};
 const header=readOrderHeader(form);if("error" in header)return header;
 const depositData=readDeposit(form); if("error" in depositData) return depositData;
 const db=await createSupabaseServerClient();
 const {data,error}=await db.rpc("create_direct_order",{p_id:id,p_customer_id:customerId||null,p_new_customer:customerId?null:customerData(form),p_new_customer_id:newCustomerId,p_notes:String(form.get("order_notes")??"").trim(),p_items:parsed.items,p_deposit:depositData.deposit,p_assignee_id:assigneeId||null,p_source_order_id:sourceId||null,p_description:header.description,p_technical_sheet:header.sheet});
 if(error) return mutationError(error);
 revalidatePath("/panel/pedidos"); revalidatePath("/panel/finanzas","layout"); revalidatePath("/panel/clientes","layout");
 redirect(`/panel/pedidos/${data}`);
}

function refreshOrders(){
 for(const path of ["/panel/pedidos","/panel/produccion","/panel/facturacion","/panel/finanzas","/panel/clientes","/panel/presupuestos"])revalidatePath(path,"layout");
}
export async function editOrder(_previous:FormState,form:FormData):Promise<FormState>{
 await requireDesigner();
 const id=String(form.get("order_id")??""),revision=Number(form.get("revision"));
 if(!validId(id)||!Number.isSafeInteger(revision)||revision<1)return {error:"Recargá la nota antes de guardar."};
 const parsed=readItems(form,true);if("error" in parsed)return parsed;
 const header=readOrderHeader(form);if("error" in header)return header;
 const db=await createSupabaseServerClient();const {error}=await db.rpc("edit_order",{p_order_id:id,p_revision:revision,p_items:parsed.items,p_description:header.description,p_technical_sheet:header.sheet,p_notes:String(form.get("order_notes")??"").trim()});
 if(error)return mutationError(error);
 refreshOrders();redirect("/panel/pedidos/"+id+"?saved=1");
}
export async function deleteOrder(_previous:FormState,form:FormData):Promise<FormState>{
 await requireDesigner();
 const id=String(form.get("order_id")??""),revision=Number(form.get("revision")),number=Number(form.get("number"));
 if(!validId(id)||!Number.isSafeInteger(revision)||revision<1||!Number.isSafeInteger(number)||number<1)return {error:"Recargá la nota antes de eliminar."};
 const db=await createSupabaseServerClient();const {error}=await db.rpc("delete_order",{p_order_id:id,p_revision:revision,p_number:number});
 if(error)return mutationError(error);
 refreshOrders();redirect("/panel/pedidos?deleted=1");
}
