# Gestión de usuarios

Implementada en `/panel/usuarios`, con acceso exclusivo del rol Administrador. La tercera migración de acceso ya se aplicó a Supabase local.

## Funciones

- Listado paginado, búsqueda por nombre/correo y filtro de activos o inactivos.
- Alta con nombre, correo exacto de Google, uno o varios roles y estado activo.
- Edición del nombre, roles y estado; el correo puede corregirse mientras la cuenta no se haya vinculado a Google.
- Estado que distingue cuentas pendientes de primer ingreso y cuentas vinculadas.
- Desactivar conserva al miembro, sus roles y su identidad; las políticas impiden seguir accediendo a la gestión. Reactivar permite volver a ingresar.

La cuenta administradora conserva su rol, correo y estado activo. Puede incorporar otros roles de negocio a su propia cuenta. La interfaz y la función de base rechazan convertir otra cuenta en administradora.

No se envían invitaciones. Para ingresar, la persona usa «Acceso del equipo» y elige el correo que habilitó la administradora. Mientras el proyecto OAuth esté en modo de prueba, también debe estar agregado como usuario de prueba en Google Auth Platform; habilitarlo en esta aplicación no modifica esa lista de Google.

## Cómo se guarda

La aplicación usa la sesión de la administradora y la función `save_team_member`. No incorpora una clave administrativa de Supabase. La función vuelve a verificar permisos y guarda datos, roles y un registro privado del cambio en una sola transacción.

Las ediciones incluyen una versión: si otra edición ya guardó cambios, se rechaza la versión antigua en lugar de sobrescribirla. Las escrituras directas sobre las tablas siguen denegadas a las sesiones normales.

## Verificación y límites

- La migración `20261025000300_manage_team.sql` se aplicó correctamente.
- TypeScript pasó después de regenerar los tipos de rutas. `npm run typecheck` ahora regenera esos tipos antes de comprobar el código.
- La compilación de código y su chequeo de tipos pasaron; el build completo quedó bloqueado por `EPERM` al escribir/borrar archivos generados en `.next`, incluso al reintentar fuera del entorno restringido.
- Se agregaron 17 pruebas SQL para el módulo (37 en total con las 20 anteriores). No se ejecutaron: el intento de ejecución no fue autorizado. Las 20 anteriores habían pasado antes de esta migración; no representan verificación del módulo nuevo.
- La revisión visual no pudo completarse: se rechazó el permiso de acceso del navegador a localhost. No se creó un usuario de prueba desde la interfaz ni se modificaron accesos reales durante la revisión.

Pendiente de ejecutar en la terminal local:

```powershell
npm.cmd run db:test
npm.cmd run typecheck
npm.cmd run build
```

Antes del build, detener el servidor de desarrollo si está usando esa salida. No borrar datos de Supabase ni reinicializar la base para resolver un bloqueo de `.next`.

Revisión manual: entrar como administradora, abrir Usuarios, dar de alta una cuenta de prueba con dos roles, editarla, desactivarla y reactivarla. Comprobar mensajes de validación, búsqueda y que la cuenta propia conserve su acceso. Los datos de una cuenta de prueba deben ser ficticios o corresponder a una persona cuya habilitación se haya acordado.
