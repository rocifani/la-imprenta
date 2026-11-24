"use server";
import {redirect} from "next/navigation";
import {revalidatePath} from "next/cache";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {requireFinance} from "./queries";
import {validId} from "@/features/sales/queries";
import {moneyToCents} from "@/features/sales/money";
import type {FormState} from "@/features/sales/types";
export async function recordMovement(_previous:FormState,form:FormData):Promise<FormState>{
 await requireFinance();const id=String(form.get("id")??"");const orderId=String(form.get("order_id")??"");
 const supplierId=String(form.get("supplier_id")??"");if(supplierId&&!validId(supplierId))return {error:"Elegí un proveedor válido."};
 const cents=moneyToCents(String(form.get("amount")??""));
 if(!validId(id)||(orderId&&!validId(orderId)))return {error:"Recargá el formulario antes de guardar."};
 if(cents===null)return {error:"Ingresá un importe mayor a cero, con hasta dos decimales."};
 const args={p_id:id,p_amount:(cents/100).toFixed(2),p_paid_on:String(form.get("paid_on")??""),p_method:String(form.get("method")??""),p_description:String(form.get("description")??"").trim()};
 const db=await createSupabaseServerClient();
 const {error}=orderId?await db.rpc("record_payment",{...args,p_order_id:orderId}):supplierId?await db.rpc("record_supplier_payment",{...args,p_supplier_id:supplierId}):await db.rpc("record_expense",args);
 if(error)return {error:["22023","23514","42501","P0002"].includes(error.code)?error.message:"No pudimos guardar el movimiento. Intentá nuevamente."};
 revalidatePath("/panel/proveedores","layout");
 revalidatePath("/panel/finanzas","layout");revalidatePath("/panel/clientes","layout");revalidatePath("/panel/pedidos","layout");
 redirect(supplierId?`/panel/proveedores/${supplierId}?saved=1`:orderId?`/panel/finanzas/pedidos/${orderId}?saved=1`:"/panel/finanzas?saved=1");
}

export async function recordCustomerPayment(_previous: FormState, form: FormData): Promise<FormState> {
  await requireFinance();
  const id = String(form.get("id") ?? "");
  const customerId = String(form.get("customer_id") ?? "");
  const cents = moneyToCents(String(form.get("amount") ?? ""));
  if (!validId(id) || !validId(customerId)) return { error: "Elegí el cliente y recargá el formulario si es necesario." };
  if (cents === null) return { error: "Ingresá un importe mayor a cero, con hasta dos decimales." };

  const db = await createSupabaseServerClient();
  const { error } = await db.rpc("record_customer_payment", {
    p_id: id,
    p_customer_id: customerId,
    p_amount: (cents / 100).toFixed(2),
    p_paid_on: String(form.get("paid_on") ?? ""),
    p_method: String(form.get("method") ?? ""),
    p_description: String(form.get("description") ?? "").trim(),
  });
  if (error) return { error: ["22023", "23514", "42501", "P0002"].includes(error.code) ? error.message : "No pudimos registrar el cobro. Intentá nuevamente." };
  for (const path of ["/panel/finanzas", "/panel/clientes", "/panel/pedidos", "/panel/proveedores"]) revalidatePath(path, "layout");
  redirect("/panel/finanzas/clientes/cobros/" + id);
}
