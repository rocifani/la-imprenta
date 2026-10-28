# Publicación automática de producción

El workflow `.github/workflows/deploy-production.yml` se ejecuta al recibir cambios en main. También admite ejecución manual desde Actions, eligiendo main. No publica desde dev ni desde pull requests. Usa secretos del repositorio, sin requerir GitHub Environments. Esta configuración fue autorizada expresamente por Rocío para mantener compatibilidad con GitHub Free.

Orden: verificar secretos → instalar dependencias → TypeScript y pruebas → traer variables Production de Vercel → comprobar Supabase y URL → generar el build productivo → revisar y aplicar migraciones pendientes → publicar el mismo artefacto en Vercel. Si un paso falla, no se ejecutan los siguientes. Se serializan las publicaciones sin cancelar una en curso.

Supabase prod verificado: `veplhgkvypxhlkofzuyb` (la-imprenta-prod). Dev sigue siendo `llpwaezydncunkikgbfd`. La referencia productiva está fijada en el workflow para evitar usar accidentalmente el proyecto enlazado en la computadora. El comando usa --skip-vault, no sube seeds, no resetea datos ni sincroniza la configuración local de Auth.

## Configuración inicial: una sola vez

### 1. Variables Production en Vercel

En el proyecto la-imprenta → Settings → Environment Variables, configurar exclusivamente Production:

| Variable | Valor |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL | https://veplhgkvypxhlkofzuyb.supabase.co |
| NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Publishable key de la-imprenta-prod |
| APP_URL | Origen HTTPS del dominio principal productivo, sin ruta |
| GOOGLE_AUTH_ENABLED | true, con Google configurado en Supabase prod |
| NEXT_PUBLIC_WHATSAPP_NUMBER | 5493413148844 |

Estas cinco variables pueden guardarse como variables normales: la clave indicada es pública. El CLI necesita recuperar sus valores para compilar; evitar marcarlas Sensitive, que puede devolver un marcador no utilizable. Nunca usar una secret/service_role key en una variable NEXT_PUBLIC. Preview conserva los valores de dev. El script corta el flujo si la URL de Supabase no coincide con prod.

Confirmar Production Branch = main en Vercel. vercel.json deshabilita solo la publicación automática Git de main; dev y otros previews conservan su automatismo. Así GitHub controla el orden migración-publicación. No agregar un deploy hook paralelo para main ni usar Redeploy/Promote como mecanismo habitual de publicación productiva.

### 2. Cinco secretos del repositorio en GitHub

No hace falta crear un GitHub Environment ni configurar sus secretos o aprobaciones. El workflow solo se ejecuta en main y mantiene las verificaciones de código, destino productivo y secuencia de migración/publicación. GitHub Actions tiene cuotas de uso según el plan; este flujo no contrata servicios ni requiere GitHub Pro.

Repositorio → Settings → Secrets and variables → Actions → New repository secret. Cargar los cinco como Repository secrets.

| Nombre exacto | Dónde se obtiene |
| --- | --- |
| SUPABASE_ACCESS_TOKEN | Supabase → Account → Access Tokens; cuenta con acceso al proyecto prod |
| SUPABASE_DB_PASSWORD | Contraseña PostgreSQL de la-imprenta-prod, elegida al crear ese proyecto |
| VERCEL_TOKEN | Vercel → Account Settings → Tokens; con acceso al propietario del proyecto |
| VERCEL_ORG_ID | orgId de .vercel/project.json después de vincular el proyecto |
| VERCEL_PROJECT_ID | projectId de .vercel/project.json después de vincular el proyecto |

Para obtener los dos IDs, desde C:\la-imprenta:

```powershell
npx vercel@65.4.0 link
Get-Content .vercel/project.json
```

Elegir el propietario correcto y el proyecto existente la-imprenta; no crear otro. link configura la carpeta local, no despliega. .vercel está excluida de Git. Los IDs no son contraseñas, pero se almacenan como secrets para mantener uniforme la configuración. Los tokens y la contraseña no se pegan en el chat ni se guardan en el repo.

Limitar el token de Supabase a la-imprenta-prod y configurar Connection Pooling en Read. Project Settings en Read permite consultar sus metadatos si hace falta. El workflow usa SUPABASE_DB_PASSWORD para las migraciones: ese acceso PostgreSQL no queda limitado por los permisos del token. No necesita Full access ni supabase link. Un token vencido o sin permiso detiene el workflow. No se necesita service_role ni clave administrativa de la API de datos.

### 3. Publicar el workflow

Guardar los archivos en dev, subirlos y abrir un pull request dev → main. Configurar los secretos del repositorio y variables antes de hacer merge. En el primer merge ya debe estar incluido vercel.json para evitar la publicación automática paralela.

Después del merge, GitHub → Actions → Publicar producción. Si Supabase prod está vacío, se ejecutan todas las migraciones; si ya tiene algunas, solo las pendientes. No es necesario repetir el paso manual db push de la guía anterior. Se sigue necesitando una configuración inicial de Auth y del equipo.

### 4. Completar Auth y administradora

Google OAuth se configura una vez en prod, autorizando el callback https://veplhgkvypxhlkofzuyb.supabase.co/auth/v1/callback en Google Cloud. Supabase Site URL = APP_URL; Redirect URLs incluye APP_URL + /auth/callback.

Después de que el primer workflow haya creado las funciones, configurar en Supabase prod → Authentication → Hooks → Before User Created → Postgres → private.before_team_user_created. Mantener el alta OAuth permitida, con el filtro activo; no habilitar ingresos anónimos. Solo los correos activos con roles podrán incorporarse al equipo.

En SQL Editor del proyecto prod ejecutar supabase/setup/cloud-prod-admin.sql para habilitar a rociobfani@gmail.com como única administradora. No ejecutar db:admin: ese script es exclusivamente local. Ingresar luego con Google y cargar los usuarios y sus roles desde la aplicación. Los usuarios y datos de dev no se copian.

## Operación habitual

1. Desarrollar y probar en dev.
2. Guardar todo cambio de esquema en una migración nueva, sin editar migraciones ya aplicadas.
3. Abrir y mergear dev → main.
4. Esperar el resultado de Publicar producción en Actions. La URL del despliegue aparece en el resumen final.
5. Comprobar ingreso y la funcionalidad afectada en la web productiva.

Para reintentar un fallo, usar Re-run failed jobs o Actions → Publicar producción → Run workflow → main. Las migraciones completadas no vuelven a ejecutarse. Un reintento de una versión anterior puede publicar código anterior: preferir ejecutar el workflow de la versión actual de main.

Si la migración falla, no se publica el nuevo código; revisar el paso que falló antes de reintentar. Si el despliegue falla después de migrar, la base conserva las migraciones aplicadas y la web anterior sigue publicada. No hay rollback automático de datos ni garantía de transacción entre distintos archivos de migración. Diseñar cambios compatibles con la versión anterior; para cambios destructivos, separar agregar/migrar datos/eliminar en publicaciones distintas.

## Verificación de esta entrega

Se validó la sintaxis del workflow con actionlint 1.7.12 y cinco pruebas del guard de configuración productiva. No se ejecutó una publicación real ni se modificó Supabase prod: faltan la configuración inicial y los secretos de GitHub. Las pruebas del workflow cubren TypeScript, dinero, fechas, fichas técnicas, PDFs y configuración productiva; no incluyen la suite SQL local con Docker.

Fuentes: [Vercel con GitHub Actions](https://vercel.com/docs/git/vercel-for-github), [control de despliegues por rama](https://vercel.com/docs/project-configuration/git-configuration), [migraciones Supabase](https://supabase.com/docs/guides/deployment/database-migrations).
