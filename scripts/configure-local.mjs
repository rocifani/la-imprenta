import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

process.chdir(fileURLToPath(new URL("../", import.meta.url)));
try {
  const raw = execFileSync(process.execPath, ["node_modules/supabase/dist/supabase.js", "status", "-o", "json"], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
  const status = JSON.parse(raw);
  const url = status.API_URL;
  const publicKey = status.PUBLISHABLE_KEY || status.ANON_KEY;
  if (!url || !publicKey || !["localhost", "127.0.0.1"].includes(new URL(url).hostname)) throw new Error("No hay un entorno local disponible.");
  let content = existsSync(".env.local") ? readFileSync(".env.local", "utf8") : "";
  const values = { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publicKey };
  for (const [name, value] of Object.entries(values)) {
    const line = `${name}=${value}`;
    const pattern = new RegExp(`^${name}=.*$`, "m");
    content = pattern.test(content) ? content.replace(pattern, line) : `${content.trimEnd()}\n${line}\n`;
  }
  if (!/^APP_URL=/m.test(content)) content += "APP_URL=http://localhost:3000\n";
  if (!/^GOOGLE_AUTH_ENABLED=/m.test(content)) content += "GOOGLE_AUTH_ENABLED=false\n";
  writeFileSync(".env.local", content.trimStart());
  console.log("Conexión local guardada en .env.local. No se guardaron claves administrativas. Google sigue sujeto a su configuración.");
} catch {
  console.error("No se pudo configurar la conexión. Comprobá que Docker y Supabase local estén iniciados.");
  process.exitCode = 1;
}
