import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";
import { getTeamAccess } from "@/features/auth/team-access";

export async function GET(request: NextRequest) {
  const destination = new URL("/acceso?error=signin", request.url);
  const code = request.nextUrl.searchParams.get("code");
  if (code && getSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const access = await getTeamAccess();
      if (access.status === "allowed") {
        destination.pathname = "/panel";
        destination.search = "";
      } else {
        await supabase.auth.signOut({ scope: "local" });
        destination.search = "?error=denied";
      }
    }
  }
  // No se aceptan destinos externos ni parámetros de redirección arbitrarios.
  const response = NextResponse.redirect(destination);
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
