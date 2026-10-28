# Supabase local

El entorno de desarrollo corre en esta computadora con Docker y la CLI de Supabase instalada como dependencia del proyecto. No usa ni modifica los dos proyectos alojados existentes. No necesita contratar Pro.

## Iniciar

1. Abrir Docker Desktop y esperar a que su motor esté funcionando.
2. En la terminal de la carpeta del proyecto:

```powershell
npm.cmd install
npm.cmd run db:start
```

El primer arranque descarga imágenes de Docker y puede demorar varios minutos. Usar la salida del comando para conocer las direcciones y credenciales locales. No copiar claves secretas al chat ni al repositorio. Supabase Studio suele estar en http://127.0.0.1:54323.

```powershell
npm.cmd run db:status
npm.cmd run db:migrate
npm.cmd run db:test
```

El primer arranque aplica las migraciones de una base nueva. `db:migrate` aplica las nuevas migraciones a una base local existente sin pedir un reinicio destructivo de sus datos.

Para detener conservando los datos locales:

```powershell
npm.cmd run db:stop
```

No usar `supabase db reset` como paso habitual: borra y recrea los datos locales. No ejecutar comandos con opciones de proyecto remoto para este entorno.

## Configuración preparada

- Identificador local: `la-imprenta-dev`.
- Registro público, registro por correo e ingresos anónimos deshabilitados.
- Google está habilitado con filtro de correos y vinculación segura de identidad. La administradora confirmó el ingreso real. Ver la [guía de Google local](google-local.md) para reproducir la configuración.
- Realtime, funciones Edge y analytics deshabilitados porque esta etapa no los necesita.
- Primera migración: miembros del equipo, roles múltiples, máximo una administradora y políticas de lectura. Un usuario autenticado no recibe permisos de escritura directa para asignar roles.
- La habilitación de la primera administradora ya se creó de forma controlada en la base local. No hay sesiones falsas, usuarios reales en semillas ni correos personales en el código.
- Se ejecutaron correctamente 20 pruebas de base de datos: privilegios, roles múltiples, administradora única, lectura propia, aislamiento, desactivación y filtro/vinculación de Google. El ingreso real con Google también fue confirmado por la administradora.

La conexión local de Next.js está guardada en `.env.local`, con URL y clave pública. Se implementaron el cliente de servidor, renovación de sesión, callback, cierre de sesión y validación de miembro activo y roles antes de mostrar el panel. Las credenciales OAuth están configuradas y el ingreso real fue confirmado. La [pantalla de gestión de usuarios](gestion-de-usuarios.md) está implementada; la migración se aplicó y la verificación completa sigue pendiente.

Verificación al 25/10/2026: Docker operativo, primer arranque completado, migración aplicada y `npm.cmd run db:test` exitoso (13 pruebas). También se validaron el archivo TOML y TypeScript. No se tocaron recursos alojados.

## Separación de producción

Las direcciones y claves locales sirven únicamente para esta máquina. No configurar Vercel con `localhost` ni con credenciales locales: producción necesitará su proyecto alojado independiente. El desarrollo de base local no estará disponible para una web desplegada en Vercel.

Guardar en Git `config.toml`, migraciones y pruebas. Los datos de Docker, configuraciones temporales y secretos quedan fuera del repositorio. En redes no confiables, iniciar los servicios ligados a loopback según la guía oficial: https://supabase.com/docs/guides/local-development.
