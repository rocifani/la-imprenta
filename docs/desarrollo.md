# Inicio del desarrollo

Primera entrega local: estructura Next.js/TypeScript, propuesta visual pública, formulario de consulta con revisión del mensaje, ruta de acceso del equipo y cierre del panel mientras no exista autenticación.

Esta entrega no implementa aún la gestión del negocio. El análisis conserva los requisitos objetivo; describir una función allí no significa que ya esté disponible en el código.

## Próximas etapas

1. Configurar el proyecto Supabase de desarrollo y el proveedor Google. Registrar usuarios autorizados, cuenta administradora única y múltiples roles por usuario, con controles del lado del servidor y políticas de acceso a datos.
2. Clientes y presupuestos directos con precios manuales; notas de varios productos y aprobación previa a producción.
3. Tarifas estándar editables y sugerencias cuando coincidan las características.
4. Cola de producción, cierre con comentarios y registro manual de facturado.
5. Finanzas: señas, cobros, pagos, compras, saldos por cliente y resumen mensual.
6. Recargos y avisos internos de atraso una vez relevadas sus reglas.

La base inicial no usa credenciales, datos reales, recursos externos ni despliegues. El envío de WhatsApp requiere confirmar y configurar el teléfono. Diseño de tablas y permisos pendiente de la etapa 1.

Verificación al 25/10/2026: dependencias instaladas y Next.js actualizado de 16.2.12 a 16.4.3 para corregir los hallazgos de npm. La auditoría de la instalación informó cero vulnerabilidades. Compilación productiva, TypeScript y generación de páginas correctos. Una auditoría independiente posterior no pudo completarse por DNS. Revisión visual pendiente.
