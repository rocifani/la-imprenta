# Ingreso con Google en desarrollo local

Google está habilitado localmente con credenciales guardadas fuera de Git. La cuenta administradora autorizada se guarda en la base local, no en migraciones ni archivos personales versionados. El 25/10/2026 la usuaria confirmó el ingreso real y compartió una captura del panel con su nombre y rol de administración.

Verificación al 25/10/2026: Auth responde correctamente, Google está habilitado, el acceso por correo está deshabilitado y las 20 pruebas de base pasaron tras el reinicio. `/acceso` responde 200 y `/panel` redirige a `/acceso` cuando no hay sesión. Estos chequeos no sustituyen la prueba de consentimiento con Google.

## 1. Google Cloud

Abrir https://console.cloud.google.com/ y crear o seleccionar un proyecto de desarrollo para La Imprenta. No hace falta habilitar facturación para el ingreso básico con Google.

En Google Auth Platform:

1. Configurar el nombre de la aplicación y el correo de soporte/contacto.
2. Elegir audiencia externa si se utilizan cuentas personales de Gmail. Durante desarrollo, mantener el modo de prueba y agregar el correo de la administradora a los usuarios de prueba.
3. Usar solamente los permisos básicos `openid`, correo y perfil. No solicitar Gmail, Drive ni otros datos.
4. Crear un cliente OAuth de tipo **Aplicación web**, llamado por ejemplo `La Imprenta local`.
5. Agregar el origen JavaScript autorizado: `http://localhost:3000`.
6. Agregar la URI de redirección autorizada: `http://127.0.0.1:54321/auth/v1/callback`.

La URI de Google corresponde a Supabase Auth, no a `/auth/callback` de Next.js. Supabase vuelve a la aplicación al terminar el intercambio.

Guardar el Client ID y el Client Secret. El secreto no se comparte por chat ni se sube al repositorio.

## 2. Guardar las credenciales localmente

Crear un archivo `.env` en la raíz del proyecto (excluido de Git) con:

```dotenv
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID=identificador-entregado-por-google
SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET=secreto-entregado-por-google
```

En `supabase/config.toml`:

- En la sección `[auth]`, cambiar `enable_signup` a `true` para permitir el primer ingreso OAuth. El hook limita el alta a Google y a correos activos previamente autorizados con roles.
- En `[auth.external.google]`, cambiar `enabled` a `true`.
- Mantener `[auth.email].enable_signup = false` y los ingresos anónimos deshabilitados.
- Mantener habilitado `[auth.hook.before_user_created]`; no retirar el filtro para solucionar un problema de acceso.

Primero aplicar las migraciones. Luego reiniciar Supabase para cargar el proveedor y el hook. Detenerlo conserva sus datos:

```powershell
npm.cmd run db:migrate
npm.cmd run db:stop
npm.cmd run db:start
npm.cmd run db:configure
```

En `.env.local`, mantener los valores de conexión que generó `db:configure` y cambiar:

```dotenv
APP_URL=http://localhost:3000
GOOGLE_AUTH_ENABLED=true
```

Iniciar o reiniciar Next.js con `npm.cmd run dev`. Abrir http://localhost:3000/acceso.

Si Google todavía no está configurado, conservar los indicadores en `false`: la web pública sigue funcionando y el acceso informa que está en preparación.

## 3. Primera administradora

La habilitación inicial ya se realizó en la base de esta computadora con el correo indicado en el chat. No se creó una contraseña ni una sesión falsa. No repetir este paso salvo que se reconstruya la base.

El comando de recuperación/inicialización local es:

```powershell
npm.cmd run db:admin -- "tu-correo-de-google" "Tu nombre"
```

El script actúa solamente sobre el contenedor local `supabase_db_la-imprenta-dev`. No puede crear una segunda administradora; falla si otro miembro ya tiene ese rol. No es una función de registro público ni debe exponerse desde la web.

## 4. Comprobación

- La cuenta habilitada puede ingresar y ve su nombre y roles en `/panel`.
- Un correo ajeno no puede darse de alta mediante Google.
- Un usuario sin sesión no puede abrir el panel.
- Una cuenta desactivada no puede consultar la gestión aunque todavía conserve cookies.
- Cerrar sesión vuelve a `/acceso`.

Los filtros de base y las políticas se verificaron con 20 pruebas SQL. El flujo real Google → Supabase → Next.js fue confirmado por la administradora. No se ha confirmado manualmente el cierre de sesión ni el intento con una segunda cuenta. La [gestión de usuarios](gestion-de-usuarios.md) ya está implementada, con sus nuevas verificaciones pendientes.

## Producción

Las URLs y credenciales de este documento son de desarrollo local. La web en Vercel requiere una base alojada, su configuración y credenciales OAuth correspondientes. No habilitar el login productivo con direcciones `localhost`.

Referencias:

- https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- https://supabase.com/docs/guides/auth/server-side/creating-a-client
