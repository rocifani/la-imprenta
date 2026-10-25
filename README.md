# La Imprenta

Aplicación en desarrollo. Primera base: Next.js con TypeScript, landing pública, formulario para preparar consultas de WhatsApp y pantalla de acceso del equipo. Supabase, Google y la gestión interna todavía no están conectados.

Tecnologías elegidas: Next.js, Vercel y Supabase. Desarrollo local; despliegue productivo pendiente.

## Desarrollo local

Requiere Node.js 22.14 o superior y npm. `uv` no es necesario: este proyecto usa JavaScript/TypeScript, no Python.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Abrir http://localhost:3000. Si el puerto está ocupado, usar la dirección que muestre la terminal. En Windows se usa `npm.cmd` para evitar conflictos con las políticas de ejecución de PowerShell.

En `.env.local`, completar `NEXT_PUBLIC_WHATSAPP_NUMBER` con el número confirmado de la imprenta, solo dígitos y con código de país y área. Si no está configurado, se puede revisar el mensaje pero no se habilita el envío. El formulario no guarda consultas ni adjuntos ni implica que se haya enviado el mensaje.

```powershell
npm.cmd run typecheck
npm.cmd run build
```

## Estado y estructura

- `src/app`: páginas, layout y estilos.
- `src/components`: componentes visuales compartidos.
- `src/features/quotes`: preparación de la consulta pública y mensaje de WhatsApp.
- `/acceso`: informa que el acceso del equipo está pendiente de configuración.
- `/panel`: redirige al acceso; no hay panel interno abierto ni permisos simulados.

El catálogo y la identidad visual son una primera propuesta para revisar. Los productos se muestran como referencias de consulta, sin precios públicos. El formulario inicial prepara una consulta de un producto; la lista de varios productos para la consulta pública queda para una siguiente iteración. Las notas internas de varios productos siguen dentro del alcance acordado.

Siguiente etapa: configurar Supabase de desarrollo y Google; implementar usuarios habilitados, roles y acceso protegido. Luego, clientes, presupuestos y notas de pedido. No se crearon recursos externos ni se desplegó la aplicación.

## GitHub

Publicar esta carpeta como repositorio privado desde VS Code. Subir `package-lock.json` junto con el código para reproducir las dependencias. `.gitignore` excluye `node_modules`, `.next`, `.env.local` y configuraciones locales. `.env.example` documenta las variables sin credenciales.

## Verificación inicial

El 25/10/2026 se revisaron las tres vulnerabilidades reportadas después de la primera instalación. Se actualizó Next.js de 16.2.12 a 16.4.3 y se actualizó `package-lock.json`. La auditoría incluida en esa instalación informó cero vulnerabilidades. `npm.cmd run build` terminó correctamente, incluyendo el chequeo de TypeScript y la generación de páginas. Una consulta independiente posterior a `npm audit` falló por resolución DNS; no invalida el resultado obtenido durante la instalación. Revisión visual todavía pendiente.

## Documentación del negocio

- [Análisis inicial y preguntas](docs/analisis-inicial.md)
- [Glosario del negocio](CONTEXT.md)

Los documentos distinguen requisitos expresados, propuestas e incógnitas. Las propuestas no representan decisiones aprobadas por la imprenta.
