# Fichas de producción y documentos para clientes

Cada trabajo conserva su nombre comercial, cantidad e importe y suma dos campos: descripción simple para el cliente y ficha técnica interna. Las características anteriores se conservan como indicaciones internas. La descripción simple se usa en PDFs de notas y presupuestos; no se envían indicaciones técnicas, comentarios del operario ni la ficha técnica al cliente. En registros anteriores se toma el nombre del trabajo como descripción inicial, que Diseño puede completar.

## Carga y consulta

El editor compartido de presupuestos y notas directas permite cargar la descripción y desplegar la ficha técnica. La composición admite hasta 20 componentes con tipo de trabajo, cantidad, copias por juego, color del papel, gramaje, perforado y ojalado. También incluye formularios, observaciones, color de impresión, block/talonario, referencia del original, medidas con unidad, rendimiento por pliego, formato, hojas y clave de imprenta. Numeración admite hasta 10 rangos y conserva letras y ceros iniciales. Los datos son indicaciones; no se calcula precio, rendimiento o numeración automáticamente. La referencia del original es texto, no un archivo adjunto.

Las versiones del presupuesto conservan su ficha; la nota copia la versión aprobada. Desde una nota existente, **Completar / editar ficha de producción** permite a Diseño actualizar la descripción para el cliente y la información técnica. No cambia cantidades, precios, cliente, cobros, estados ni comentarios de cierre. La revisión de ficha evita que dos usuarios sobrescriban cambios simultáneos y se registra autor y fecha de modificación.

Producción ve la ficha con tabla de componentes, numeración e indicaciones por trabajo, sin acceso adicional a precios. Operarios siguen marcando finalización individual o completa. La edición de ficha es de Diseño.

## Resumen descargable del cliente

Desde la ficha del cliente se puede ver y descargar un resumen de **trabajos terminados**. La función SQL excluye trabajos sin terminar y selecciona únicamente datos comerciales. Incluye notas con al menos un trabajo terminado, incluso si ya están pagadas. Cada nota muestra los trabajos terminados, su importe conjunto y, por separado, total acordado, cobrado y saldo de la nota completa. Los cobros se aplican por nota: no se asigna deuda a un trabajo arbitrariamente. El saldo general del PDF es la suma de las notas incluidas, no el saldo de notas que no tienen trabajos terminados.

El resumen se obtiene completo, sin depender de las 20 filas del historial paginado. Se genera con una sola lectura consistente. En la ficha permanece el resumen operativo de trabajos pendientes y saldos, diferenciado del documento del cliente. La nota de pedido individual sigue describiendo todos los trabajos acordados; la selección de solo terminados corresponde al resumen por cliente solicitado.

## Datos y pruebas

Migraciones 20261025001500_work_sheets_and_customer_summary.sql y 20261025001600_completed_customer_report.sql. Campos añadidos en quote_items y order_items; las reglas y permisos existentes se conservan. Pruebas SQL verifican conversión, persistencia, ceros en numeración, validación, edición con revisión, conservación de importes y cierres, permisos y exclusión de información interna y trabajos pendientes. Se generaron y revisaron PDFs de una página, sin trabajos y de 24 notas con textos extensos.
