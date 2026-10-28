import test from "node:test";
import assert from "node:assert/strict";
import { validateProductionEnv } from "../scripts/check-production-env.mjs";

const ref = "veplhgkvypxhlkofzuyb";
const env = {
  NEXT_PUBLIC_SUPABASE_URL: `https://${ref}.supabase.co`,
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_example",
  APP_URL: "https://imprenta.example.com",
  GOOGLE_AUTH_ENABLED: "true",
  NEXT_PUBLIC_WHATSAPP_NUMBER: "5493413148844",
};

test("Acepta la configuración de prod con dominio propio o Vercel", () => {
  assert.doesNotThrow(() => validateProductionEnv(env, ref));
  assert.doesNotThrow(() => validateProductionEnv({...env, APP_URL: "https://la-imprenta-smoky.vercel.app/"}, ref));
});
test("Rechaza Supabase dev, conexión local y URLs con credenciales", () => {
  for (const url of ["https://llpwaezydncunkikgbfd.supabase.co", "http://127.0.0.1:54321", `https://user:secret@${ref}.supabase.co`]) {
    assert.throws(() => validateProductionEnv({...env, NEXT_PUBLIC_SUPABASE_URL:url}, ref));
  }
});
test("Rechaza secretos administrativos en la clave pública y variables faltantes", () => {
  assert.throws(() => validateProductionEnv({...env, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:"sb_secret_example"}, ref));
  for (const key of Object.keys(env)) assert.throws(() => validateProductionEnv({...env, [key]:""}, ref));
});
test("Rechaza APP_URL local, HTTP o con ruta de login", () => {
  for (const APP_URL of ["http://imprenta.example.com", "https://localhost", env.APP_URL+"/acceso", env.APP_URL+"?test=1"]) {
    assert.throws(() => validateProductionEnv({...env, APP_URL}, ref));
  }
});
test("Rechaza Google deshabilitado, WhatsApp inválido y referencia ausente", () => {
  assert.throws(() => validateProductionEnv({...env, GOOGLE_AUTH_ENABLED:"false"}, ref));
  assert.throws(() => validateProductionEnv({...env, NEXT_PUBLIC_WHATSAPP_NUMBER:"+54 9 341"}, ref));
  assert.throws(() => validateProductionEnv(env, undefined));
});
