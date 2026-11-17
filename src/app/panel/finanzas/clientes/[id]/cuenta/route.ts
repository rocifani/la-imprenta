import { NextRequest, NextResponse } from "next/server";
import { getTeamAccess } from "@/features/auth/team-access";
import { validId } from "@/features/sales/queries";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const headers = { "Cache-Control": "private, no-store" };
  const access = await getTeamAccess();
  if (access.status !== "allowed") return NextResponse.json({ error: "Ingresá nuevamente." }, { status: 401, headers });
  if (!access.roles.includes("finance")) return NextResponse.json({ error: "Sin permiso." }, { status: 403, headers });
  const { id } = await params;
  if (!validId(id)) return NextResponse.json({ error: "Cliente inválido." }, { status: 400, headers });
  const db = await createSupabaseServerClient();
  const { data, error } = await db.rpc("finance_customer_account", { p_customer_id: id });
  if (error) return NextResponse.json({ error: "No pudimos cargar los saldos." }, { status: 503, headers });
  if (!data) return NextResponse.json({ error: "El cliente no existe." }, { status: 404, headers });
  return NextResponse.json(data, { headers });
}
