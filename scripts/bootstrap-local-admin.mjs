import { execFileSync } from "node:child_process";

const [emailInput, nameInput = "Administradora"] = process.argv.slice(2);
const email = emailInput?.trim().toLowerCase();
const name = nameInput.trim();
if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !name) {
  console.error('Uso: npm run db:admin -- "correo@example.com" "Nombre"');
  process.exit(1);
}
const literal = (value) => `'${value.replaceAll("'", "''")}'`;
const sql = `begin;
  with member as (
    insert into public.team_members(email, display_name, active)
    values (${literal(email)}, ${literal(name)}, true)
    on conflict (email) do update set display_name = excluded.display_name, active = true
    returning id
  ) insert into public.team_member_roles(member_id, role)
    select id, 'administrator' from member on conflict (member_id, role) do nothing;
  commit;`;
try {
  // Contenedor local fijo: este script nunca usa una URL o credencial remota.
  execFileSync("docker", ["exec", "-i", "supabase_db_la-imprenta-dev", "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1"], { input: sql, encoding: "utf8", stdio: ["pipe", "pipe", "pipe"] });
  console.log("Cuenta administradora habilitada localmente. No se creó una contraseña ni una sesión de Google.");
} catch {
  console.error("No se pudo habilitar la administradora. Verificá Docker, las migraciones y que no exista otra cuenta administradora.");
  process.exitCode = 1;
}
