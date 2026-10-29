# Fichas de producción y documentos para clientes

Desde el 29/10/2026, una nota representa un trabajo general (por ejemplo, imanes promocionales) con varios ítems o modelos (delfines, tortugas). Cada nota tiene una descripción general comercial y una única ficha técnica interna, común a todos sus ítems. Cada ítem mantiene nombre, descripción para el cliente, indicaciones específicas, cantidad, precio y cierre de producción.

## Carga y consulta

La descripción general y la ficha se cargan una sola vez al crear una nota directa, generar una nota desde un presupuesto aprobado o editar una nota existente. Los presupuestos mantienen el detalle comercial por ítem; la ficha técnica se completa al preparar la nota. Duplicar una nota precarga su descripción y ficha general, pero no copia pagos, facturación, cierres ni responsables.

La composición admite hasta 20 componentes con tipo de trabajo, cantidad, copias, color del papel, gramaje, perforado y ojalado. Incluye formularios, observaciones, impresión, block/talonario, referencia del original, medidas, rendimiento, formato, hojas y clave de imprenta. Numeración admite hasta 10 rangos con punto de venta, desde y hasta, conservando los ceros. No calcula costos ni rendimientos automáticamente.

Diseño puede editar la descripción y ficha general, además de las descripciones comerciales e indicaciones por ítem, únicamente mientras la nota no tenga cobros (incluida seña) ni ningún ítem terminado. Desde «Editar nota e ítems» también puede cambiar nombres, cantidades, precios y observaciones, agregar o quitar ítems. No cambia cliente, presupuesto de origen, cobros ni cierres. La revisión de ficha detecta cambios concurrentes y registra autor y fecha. Producción consulta una sola ficha común y sigue cerrando ítems individualmente o la nota completa.

## PDFs de la nota

Cliente: cliente y contacto a la derecha del logo; número y fecha a la izquierda. La descripción general se destaca en un recuadro gris al comienzo, antes de los ítems. Conserva cantidades, importes, seña, cobros y saldo. Excluye la ficha técnica y las indicaciones internas.

Taller: cliente a la derecha; descripción general en el mismo recuadro gris; ítems con cantidad y estado; una sola ficha común y último pase. Sin importes, cobros ni saldo. Textos largos continúan en páginas nuevas sin truncarse. El presupuesto conserva su presentación anterior, con cliente y contacto debajo del encabezado.

## Migración y compatibilidad

La migración 20261029001900_order_general_work_details.sql añade work_description y technical_sheet a orders. Por autorización expresa de Rocío, vacía las fichas técnicas anteriores de order_items, sin trasladarlas a la ficha general. Las notas anteriores empiezan con la ficha general vacía; el resto de sus datos se conserva.

Los RPC de alta, conversión y edición aceptan los campos comunes y mantienen defaults para clientes anteriores. Las llamadas reintentadas no sobrescriben la descripción o ficha de una nota ya creada. Los helpers privados no son accesibles a usuarios autenticados. El taller recibe una proyección explícita sin datos financieros.

## Resumen descargable del cliente

Desde la ficha del cliente se puede ver y descargar un resumen de **trabajos terminados**. La función SQL excluye trabajos sin terminar y selecciona únicamente datos comerciales. Incluye notas con al menos un trabajo terminado, incluso si ya están pagadas. Cada nota muestra los trabajos terminados, su importe conjunto y, por separado, total acordado, cobrado y saldo de la nota completa. Los cobros se aplican por nota: no se asigna deuda a un trabajo arbitrariamente. El saldo general del PDF es la suma de las notas incluidas, no el saldo de notas que no tienen trabajos terminados.

El resumen se obtiene completo, sin depender de las 20 filas del historial paginado. Se genera con una sola lectura consistente. En la ficha permanece el resumen operativo de trabajos pendientes y saldos, diferenciado del documento del cliente. La nota de pedido individual sigue describiendo todos los trabajos acordados; la selección de solo terminados corresponde al resumen por cliente solicitado.

## Datos y pruebas

Se aplicó y probó la migración localmente: 230 pruebas SQL aprobadas, incluyendo 22 casos de ficha general y compatibilidad con el circuito anterior. Se verifican alta, copia, conversión, ceros, validación, revisión concurrente, permisos y conservación de cobros y cierres. Las pruebas PDF y de campos comunes verifican privacidad, ficha única y paginación; los documentos renderizados se revisaron visualmente. La vista de alta con dos ítems muestra una sola ficha a 390 y 1100 px, sin desbordamiento horizontal, con datos ficticios.

El pase a producción se realiza mediante el workflow al mergear a main. No se publicó ni se modificó prod durante esta implementación.

## Edición de ítems y borrado definitivo (migración 020)

Decisión de Rocío: una nota con algún cobro, incluida una seña, o con al menos un ítem terminado no puede editarse ni eliminarse. Se bloquean tanto el nuevo editor como el anterior de ficha. El control SQL toma el mismo bloqueo de fila usado por cobros y cierres de producción, además de comprobar la revisión de la nota; un formulario abierto antes de un cobro/cierre no puede evadir la regla.

El editor conserva las identidades de los ítems existentes, permite agregar y quitar, recalcula total/saldo a partir de los importes por lote y mantiene cliente, presupuesto, responsable, pases y fecha de alta. Los nuevos ítems quedan pendientes. La edición comparte revisión con la ficha general. El presupuesto aprobado original no se modifica.

El borrado es físico y exige confirmación con el número de nota visible. Elimina la nota, ítems, ficha y pases, conservando cliente, presupuesto y notas duplicadas independientes. Las copias pierden solamente su referencia a la nota de origen borrada. Los números no se reutilizan. Nunca elimina movimientos de dinero: su existencia bloquea la operación.

Los RPC edit_order y delete_order requieren Diseño; los helpers privados no son ejecutables por authenticated. Los listados de Diseño, Producción, Facturación, Finanzas y ficha del cliente se revalidan después de guardar o borrar.

Verificación: 276 pruebas SQL, incluyendo 46 casos de edición/borrado y bloqueo por pago, seña, finalización parcial, revisión, permisos, copias, pases y presupuesto. Migración aplicada localmente y a Supabase dev. Producción se actualiza mediante el workflow de main.
