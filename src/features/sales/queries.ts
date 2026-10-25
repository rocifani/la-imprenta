import { redirect, notFound } from "next/navigation";
import { getTeamAccess } from "@/features/auth/team-access";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Customer, Quote, QuoteVersion, QuoteItem, Order, OrderItem } from "./types";

export const validId = (value: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
export const customerColumns = "id, display_name, contact_name, phone, email, address, cuit, notes, version";

export async function requireDesigner() {
  const access = await getTeamAccess();
  if (access.status !== "allowed") redirect("/acceso");
  if (!access.roles.includes("designer")) redirect("/panel");
  return access;
}

export async function getCustomer(id: string): Promise<Customer> {
  await requireDesigner();
  if (!validId(id)) notFound();
  const db = await createSupabaseServerClient();
  const { data, error } = await db.from("customers").select(customerColumns).eq("id", id).maybeSingle();
  if (error) throw new Error("No pudimos cargar el cliente.");
  if (!data) notFound();
  return data as Customer;
}

export async function getQuote(id: string) {
  await requireDesigner();
  if (!validId(id)) notFound();
  const db = await createSupabaseServerClient();
  const { data: quote, error } = await db.from("quotes").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error("No pudimos cargar el presupuesto.");
  if (!quote) notFound();
  const [{ data: version, error: versionError }, { data: items, error: itemsError }, { data: order, error: orderError }] = await Promise.all([
    db.from("quote_versions").select("*").eq("id", quote.current_version_id).single(),
    db.from("quote_items").select("description, specifications, quantity, amount").eq("version_id", quote.current_version_id).order("position"),
    db.from("orders").select("id,number").eq("quote_id", id).maybeSingle(),
  ]);
  if (versionError || itemsError || orderError) throw new Error("No pudimos cargar el detalle del presupuesto.");
  const { data: customer, error: customerError } = quote.customer_id ? await db.from("customers").select("id,display_name,phone").eq("id", quote.customer_id).single() : { data: null, error: null };
  if (customerError) throw new Error("No pudimos cargar el cliente del presupuesto.");
  return { quote: quote as Quote, version: version as QuoteVersion, items: items as QuoteItem[], order: order as { id: string; number: number } | null, customer: customer as Pick<Customer, "id" | "display_name" | "phone"> | null };
}

export async function getOrder(id: string) {
  await requireDesigner();
  if (!validId(id)) notFound();
  const db = await createSupabaseServerClient();
  const [{ data: order, error }, { data: items, error: itemsError }] = await Promise.all([
    db.from("orders").select("*").eq("id", id).maybeSingle(),
    db.from("order_items").select("*").eq("order_id", id).order("position"),
  ]);
  if (error || itemsError) throw new Error("No pudimos cargar la nota de pedido.");
  if (!order) notFound();
  return { order: order as Order, items: items as OrderItem[] };
}
