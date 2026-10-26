# Supabase alojado de desarrollo

Proyecto: la-imprenta-dev. Referencia: llpwaezydncunkikgbfd. URL: https://llpwaezydncunkikgbfd.supabase.co.

La configuración local de Docker se mantiene en .env.local y .env. El archivo ignorado .env.vercel-dev contiene las variables públicas del proyecto alojado para importar en Vercel; antes de desplegar hay que agregar APP_URL con la URL exacta del sitio. La clave publishable no administra la base ni permite aplicar migraciones.

## Conexión y migraciones

Desde C:\la-imprenta, iniciar sesión con npx supabase login en la cuenta que administra este proyecto. Los tokens y contraseñas se ingresan en la terminal o navegador; no se comparten en el chat ni se agregan a Git.

Vincular exclusivamente a llpwaezydncunkikgbfd, comprobar las migraciones pendientes con db push --dry-run y aplicar con db push. El alta remota empieza vacía: las migraciones crean el esquema y las políticas; no copian datos de Docker ni usuarios de Auth. No usar db reset contra el proyecto alojado.

Después de migrar, ejecutar supabase/setup/cloud-dev-admin.sql en el SQL Editor de ese proyecto. Habilita únicamente a Rocío como administradora; los roles comerciales se asignan desde Usuarios. El script db:admin de package.json es exclusivo de Docker local.

## Google y despliegue

En Authentication → Sign In / Providers, configurar Google con el OAuth client de desarrollo. En Google Cloud, agregar el callback https://llpwaezydncunkikgbfd.supabase.co/auth/v1/callback a las URI de redirección autorizadas del cliente OAuth. El secreto de Google pertenece a la configuración de Auth de Supabase, no a variables NEXT_PUBLIC.

En Authentication → Hooks, configurar Before User Created con la función private.before_team_user_created creada por la migración de acceso. Revisar también los métodos de ingreso para conservar el acceso solo mediante Google.

Cuando conozcamos el dominio del sitio de prueba, configurar en Supabase su Site URL y autorizar https://DOMINIO/auth/callback en Redirect URLs; APP_URL debe coincidir con el dominio publicado. localhost puede permanecer como URL adicional si se va a usar esta base desde la app local.

Verificar login con la cuenta administradora autorizada y rechazo de cuentas sin habilitación. Asignar los roles necesarios a quienes van a probar. Mantener los datos de prueba separados de producción.


## Estado verificado el 25/10/2026

La CLI quedó vinculada a llpwaezydncunkikgbfd (la-imprenta-dev), las 14 migraciones se aplicaron y la cuenta rociobfani@gmail.com quedó habilitada como única administradora. Se verificaron cero pedidos y cero movimientos financieros en la base nueva. No se copiaron los datos locales ni se modificó la base de producción. La configuración local permanece intacta.

Google quedó habilitado, el filtro Before User Created configurado y el registro por correo deshabilitado. Se verificó que el endpoint remoto de inicio de sesión responde con redirección a accounts.google.com. La revisión de migraciones no encontró pendientes. Falta autorizar en el cliente OAuth de Google Cloud el callback remoto y definir la URL pública de la aplicación para APP_URL y Redirect URLs.

La URL estable verificada de la rama dev es https://la-imprenta-git-dev-rocio-fanis-projects.vercel.app. Se configuró como Site URL, se autorizó su /auth/callback y se guardó como APP_URL en .env.vercel-dev. Vercel todavía requiere guardar APP_URL en Preview y volver a desplegar dev. Las dos URLs verificadas redirigen a Vercel Authentication: falta desactivar esa barrera para que los usuarios de la app puedan probar sin una cuenta de Vercel. La autorización por correo y roles de la aplicación permanece activa.

Las migraciones 20261025001500 y 20261025001600 se aplicaron al proyecto dev para separar descripciones comerciales, cargar fichas técnicas y ofrecer el resumen de trabajos terminados. Producción no fue modificada. El código de esta entrega requiere commit y push a dev para desplegarse en Vercel.
