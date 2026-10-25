# Producción

El rol Producción (operator) habilita una cola con notas pendientes, terminadas o todas. Se incluyen notas directas y las creadas desde presupuestos aprobados.

Cada trabajo muestra descripción, características, cantidad y estado. El operario confirma directamente su finalización, sin una acción previa de inicio. Puede terminar un trabajo individual o todos los restantes de una nota y dejar un comentario opcional de hasta 2000 caracteres. Al tocar el botón de terminar, un diálogo pide confirmación con Sí o No; se elimina el checkbox previo. Cancelar conserva el comentario y no modifica el trabajo. El cierre guarda fecha y autor; repetirlo conserva lo registrado. Un cierre completo respeta comentarios y cierres anteriores. No se implementa reapertura en esta entrega.

Los comentarios se consultan desde el taller y desde el detalle comercial de la nota. Son internos y se excluyen del PDF al cliente. Producción recibe una proyección sin precios ni notas privadas de la ficha del cliente. Los permisos se controlan en servidor y SQL. El administrador debe asignarse Producción si quiere acceder al taller.

## Estado visible de la nota

- Confirmada: todos los trabajos están pendientes.
- Parcialmente terminada: al menos uno está terminado y faltan otros.
- Terminada: todos están terminados.
- Facturada: según la flag independiente de facturación, manteniendo visible el avance del taller. El registro manual está disponible para el rol Facturación; ver [Facturación](facturacion.md).

El estado se calcula a partir de los trabajos, junto con su cantidad terminada/total y una barra de avance. No se almacena otro estado de producción en la nota. Aprobado corresponde al presupuesto.

## Datos y validación

La migración 20261025001100_work_completion_only.sql elimina la función de inicio, convierte los estados anteriores en proceso a pendientes y restringe el estado de cada trabajo a pendiente o terminado. Conserva todos los trabajos ya terminados y sus comentarios. Las migraciones anteriores permanecen como historial.

Las pruebas verifican permisos, proyección de datos, cierre parcial y completo, comentarios, reintentos y auditoría. La interfaz usa filas de confirmación clickeables, formularios y botones adaptables. La revisión visual completa en dispositivos sigue pendiente.
