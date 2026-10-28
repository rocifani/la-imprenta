import { NextRequest, NextResponse } from "next/server";
import { getTeamAccess } from "@/features/auth/team-access";
import { searchTerm } from "@/features/sales/list-controls";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const access = await getTeamAccess();
  const headers = { "Cache-Control": "private, no-store" };
  if (access.status !== "allowed") return NextResponse.json({ error: "Necesitás ingresar." }, { status: 401, headers });
  if (!access.roles.includes("designer")) return NextResponse.json({ error: "Sin permiso." }, { status: 403, headers });
  const term = searchTerm((request.nextUrl.searchParams.get("q") ?? "").slice(0, 100).trim());
  const db = await createSupabaseServerClient();
  let query = db.from("customers").select("id,display_name,phone,contact_name").order("display_name").order("id").limit(20);
  if (term) query = query.or(`display_name.ilike.%${term}%,phone.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) return NextResponse.json({ error: "No se pudo buscar." }, { status: 503, headers });
  return NextResponse.json({ customers: data }, { headers });
}
