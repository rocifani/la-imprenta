# Inicio del desarrollo

Primera entrega local: estructura Next.js/TypeScript, propuesta visual pública, formulario de consulta con revisión del mensaje, ruta de acceso del equipo y cierre del panel mientras no exista autenticación.

Esta entrega no implementa aún la gestión del negocio. El análisis conserva los requisitos objetivo; describir una función allí no significa que ya esté disponible en el código.

Identidad: el logo original recibido está conservado en `public/brand/la-imprenta-logo.png` y se utiliza mediante el componente compartido `Brand` en encabezado, pie y acceso. El resto de la composición gráfica de la landing sigue siendo una propuesta visual.

## Próximas etapas

1. Supabase local está levantado en Docker y conectado a Next.js. La administradora confirmó el ingreso real con Google el 25/10/2026. Se implementó la gestión de usuarios con su migración aplicada; quedan pendientes sus nuevas pruebas y la revisión visual por permisos rechazados. Ver [estado y límites](gestion-de-usuarios.md). Las 20 pruebas anteriores corresponden a la base de acceso, no al módulo nuevo.
2. Clientes y presupuestos directos con precios manuales; notas de varios productos y aprobación previa a producción.
3. Tarifas estándar editables y sugerencias cuando coincidan las características.
4. Cola de producción, cierre con comentarios y registro manual de facturado.
5. Finanzas: señas, cobros, pagos, compras, saldos por cliente y resumen mensual.
6. Recargos y avisos internos de atraso una vez relevadas sus reglas.

La base inicial no usa datos reales, recursos alojados ni despliegues. El envío de WhatsApp requiere confirmar y configurar el teléfono. La [propuesta de modelo de datos](modelo-de-datos.md) describe las relaciones previstas; la primera migración de acceso ya se aplicó y verificó con Docker. Ver [Supabase local](supabase-local.md). Los permisos detallados del resto del negocio se implementarán por etapas.

Verificación al 25/10/2026: dependencias instaladas y Next.js actualizado de 16.2.12 a 16.4.3 para corregir los hallazgos de npm. La auditoría de la instalación informó cero vulnerabilidades. Compilación productiva, TypeScript y generación de páginas correctos. Una auditoría independiente posterior no pudo completarse por DNS. Revisión visual pendiente.
