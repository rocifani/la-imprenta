import { pathToFileURL } from "node:url";

export function validateProductionEnv(env, expectedProjectRef) {
  const required = ["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "APP_URL", "GOOGLE_AUTH_ENABLED", "NEXT_PUBLIC_WHATSAPP_NUMBER"];
  for (const name of required) {
    if (!env[name]) throw new Error(`Falta la variable Production: ${name}.`);
  }
  if (!/^[a-z]{20}$/.test(expectedProjectRef ?? "")) {
    throw new Error("Falta una referencia productiva válida en el workflow.");
  }
  const supabase = new URL(env.NEXT_PUBLIC_SUPABASE_URL);
  if (supabase.origin !== `https://${expectedProjectRef}.supabase.co` || supabase.pathname !== "/" || supabase.search || supabase.hash || supabase.username || supabase.password) {
    throw new Error("Las variables de Vercel Production no apuntan al Supabase prod esperado.");
  }
  if (!env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_")) {
    throw new Error("Usá la Publishable key de Supabase prod en NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  }
  const app = new URL(env.APP_URL);
  if (app.protocol !== "https:" || app.hostname === "localhost" || app.hostname === "127.0.0.1" || app.hostname.endsWith(".localhost") || app.pathname !== "/" || app.search || app.hash || app.username || app.password) {
    throw new Error("APP_URL debe ser el origen HTTPS de la web productiva, sin /acceso ni /auth/callback.");
  }
  if (env.GOOGLE_AUTH_ENABLED !== "true") throw new Error("Habilitá GOOGLE_AUTH_ENABLED en Production después de configurar Google.");
  if (!/^\d{10,15}$/.test(env.NEXT_PUBLIC_WHATSAPP_NUMBER)) throw new Error("Revisá el WhatsApp productivo: solo dígitos con código de país.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    validateProductionEnv(process.env, process.env.SUPABASE_PROJECT_REF);
    console.log("Configuración productiva verificada; no se mostraron credenciales.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "No se pudo validar la configuración productiva.");
    process.exitCode = 1;
  }
}
