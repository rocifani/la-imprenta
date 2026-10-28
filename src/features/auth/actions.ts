"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseConfig } from "@/lib/supabase/config";

export async function signInWithGoogle() {
  if (!getSupabaseConfig() || process.env.GOOGLE_AUTH_ENABLED !== "true") redirect("/acceso?error=configuration");
  const appUrl = process.env.APP_URL;
  if (!appUrl) redirect("/acceso?error=configuration");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: new URL("/auth/callback", appUrl).toString(), queryParams: { prompt: "select_account" } },
  });
  if (error || !data.url) redirect("/acceso?error=signin");
  redirect(data.url);
}

export async function signOut() {
  // Las Server Actions verifican origen; el cierre no se expone como un GET.
  if (getSupabaseConfig()) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signOut({ scope: "local" });
    if (error) redirect("/acceso?error=signout");
  }
  redirect("/acceso");
}
