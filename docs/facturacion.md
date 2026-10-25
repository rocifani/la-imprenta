# Facturación manual

El rol Facturación habilita una lista que abre por defecto en Todas las notas. Permite combinar estado (Todas, Pendientes de facturar o Facturadas), cliente y fechas de creación desde/hasta. Las fechas incluyen los días completos según Argentina; los filtros se conservan al paginar y se pueden limpiar. El detalle muestra los datos históricos del cliente, incluido CUIT, los trabajos y sus importes acordados. No expone observaciones internas del cliente o del pedido.

El facturador emite la factura en ARCA por fuera de la aplicación y luego toca **Marcar como facturada**, confirmando Sí o No en un diálogo compartido con Producción. Se guarda la flag, la fecha de registro y el usuario. Un reintento conserva el registro original. No se emiten comprobantes, no se conecta con ARCA y no se registran cobros ni se modifica el importe acordado.

La facturación es independiente de producción: puede registrarse con trabajos pendientes, parcialmente terminados o terminados. Marcar una nota como facturada no modifica los estados del taller. Facturar por trabajo y agrupar varias notas en una factura requieren definición. La corrección de una marca sigue pendiente.

El estado Facturada se refleja en la lista comercial y el detalle de la nota, conservando visible el avance de producción. El rol no concede permisos para modificar clientes, importes o producción. Administrador debe asignarse Facturación si quiere utilizar el módulo.

Migraciones: 20261025001200_billing.sql y 20261025001300_billing_filters.sql. Las funciones verifican usuario activo y rol en SQL, además del control en servidor. Las pruebas verifican permisos, independencia de producción, filtros, auditoría, reintentos y conservación del importe.

El selector de clientes usa una proyección limitada a id, nombre y teléfono de clientes con notas, protegida por el rol Facturación. No requiere Diseño ni habilita acceso general a fichas de clientes.
