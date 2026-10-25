# Clientes, presupuestos y notas de pedido

Primera entrega del circuito comercial, disponible para usuarios activos con rol **Diseño**. Administrador conserva solamente los permisos de gestión de accesos; puede asignarse Diseño desde Usuarios si necesita probar o trabajar en este circuito.

## Funciones disponibles

- Clientes: alta, edición, búsqueda y ficha con historial paginado de notas de pedido.
- CUIT opcional en alta, edición y ficha, también disponible al crear el cliente durante la conversión a pedido. Acepta guiones y espacios y guarda 11 dígitos como texto. No comprueba el dígito verificador ni consulta ARCA. Las nuevas notas conservan el CUIT vigente al crearlas; las anteriores no se completan retroactivamente.
- Presupuesto directo: destinatario sin ficha de cliente obligatoria, teléfono opcional, entre 1 y 50 trabajos y observaciones.
- Al crear o editar un borrador se puede elegir un cliente existente mediante un buscador reutilizado en formularios y filtros. Se guardan su identificador y una copia de nombre y teléfono en la versión. La carga manual sigue disponible para consultas sin ficha.
- El listado permite combinar estado, cliente específico (o sin ficha) y rango inclusivo de fechas de creación, según Argentina. Los filtros se conservan al paginar y pueden limpiarse. Desde la ficha se puede crear un presupuesto para ese cliente o abrir sus presupuestos filtrados.
- Cada trabajo tiene descripción, características libres, cantidad y precio final del lote en ARS. El importe no se multiplica por la cantidad. Se admiten hasta dos decimales y formatos como `96400,50` o `96.400,50`.
- Guardar cambios en un borrador conserva una nueva versión, sin sobrescribir las anteriores. El detalle permite consultar el historial.
- Aprobación: el diseñador confirma que recibió la aceptación del cliente y puede agregar un comentario opcional de hasta 500 caracteres. Se registran usuario y fecha aunque no haya comentario. No es una aprobación digital realizada por el cliente desde la web.
- Nota de pedido: a partir de un presupuesto aprobado, seleccionar un cliente existente (búsqueda sobre toda la base) o darlo de alta en el mismo paso. Se copian trabajos y características, sin volver a cargarlos.
- Si el presupuesto ya tiene un cliente asociado, la nota lo conserva automáticamente; no permite reemplazarlo por otro al convertir. Para presupuestos manuales, la conversión vincula la ficha seleccionada o creada. La migración solo recupera asociaciones anteriores desde notas inequívocas, sin comparar nombres.
- Reintentar el alta del mismo formulario o la generación de la nota no duplica el documento. La conversión crea cliente y pedido de forma atómica.
- El pedido conserva una copia histórica de los datos del cliente y el acuerdo. Editar la ficha no modifica notas anteriores.

Los números `PP-000001` y `NP-000001` son correlativos internos de la aplicación. No reproducen aún la letra ni el esquema de numeración de las fichas originales; ese criterio sigue pendiente de relevamiento. No tienen significado fiscal.

## Reglas de precio de esta entrega

El importe cargado es el precio final a cobrar por el lote, incluidos impuestos si corresponden. No hay una alícuota asumida ni se calcula IVA adicional. Si la referencia comercial indica «más IVA», el diseñador debe determinar e ingresar el precio final acordado. Este criterio permite probar el circuito manual sin inventar reglas tributarias ni de costos; la presentación separada de impuestos deberá relevarse antes de automatizarla.

Esta entrega no carga automáticamente el PDF de precios ni sugiere tarifas. Ese trabajo sigue como siguiente etapa. Los acuerdos aprobados no son editables; no se implementaron todavía recotizaciones posteriores a la aprobación, cancelaciones, vencimientos ni aprobación parcial.

## Alcance que sigue pendiente

- Cobros, señas y saldos: la ficha indica expresamente que todavía no están disponibles, sin mostrar una deuda o un saldo ficticio de cero.
- Operarios: los ítems del pedido nacen pendientes, pero aún no hay acciones de avance/cierre ni comentarios de producción en este módulo.
- Facturador: el esquema prevé la condición de facturado, pero aún no hay una acción para modificarla.
- Archivos de muestra o impresión y notificaciones al cliente no forman parte de esta entrega. Se incorporó posteriormente la descarga de la nota en PDF para enviar manualmente al cliente; el seguimiento público y las notificaciones generales siguen excluidos.
- Otros roles no reciben automáticamente permiso de lectura de datos comerciales. Se definirán sus vistas y permisos al implementar sus módulos.
- El formulario de WhatsApp de la landing sigue separado: no crea registros internos automáticamente.

## Modelo implementado

Migración `20261025000400_customers_quotes_orders.sql`:

- `customers`: ficha interna con versión para detectar ediciones concurrentes.
- `quotes`: identificador, estado, número interno, versión actual y registro de aprobación.
- `quotes.customer_id` permite filtrar por cliente; `quote_versions.customer_id` conserva el vínculo de cada versión. Se indexaron cliente/fecha y fecha de creación. Los borradores anteriores sin vínculo pueden editarse para asignarlos a una ficha.
- `quote_versions` y `quote_items`: versiones e ítems inmutables conservados en cada guardado.
- `orders` y `order_items`: notas directas o una nota por presupuesto aprobado; copia del acuerdo e ítems con avance individual preparado para la siguiente etapa.

Las tablas tienen RLS y permisos de solo lectura para sesiones con Diseño. Las escrituras pasan por funciones específicas que vuelven a comprobar el rol y ejecutan la operación en una transacción, sin usar claves administrativas en la web. La API de búsqueda de clientes exige sesión y Diseño y responde sin caché compartida.

## Verificación al 25/10/2026

- Migración local aplicada.
- **56 pruebas SQL aprobadas**: incluye las 37 de acceso/usuarios y 19 del circuito comercial. Se verifican permisos, versiones, edición concurrente, aprobación previa, conversión, totales de lotes, prevención de duplicados y conservación de datos históricos.
- **3 pruebas de importes aprobadas**, con formatos argentinos y rechazo de valores inválidos.
- TypeScript y compilación productiva completos, incluyendo todas las rutas nuevas.
- La revisión visual y el recorrido con la sesión real de la usuaria quedan pendientes; no se intentó volver a acceder al navegador tras el permiso rechazado en la entrega anterior.

Actualización de asociación y filtros: migración `20261025000600_quote_customer.sql` aplicada, 68 pruebas SQL y 3 pruebas de fechas aprobadas, más TypeScript y compilación productiva completa. Las pruebas cubren copia de datos del cliente desde servidor, historial del vínculo, cliente de conversión, días completos en Argentina, rangos abiertos y fechas inválidas. La comprobación visual sigue pendiente.

## PDF de la nota para el cliente

En el detalle de la nota se ofrece «Descargar PDF para cliente». Incluye logo, número y fecha, datos históricos del cliente (incluido CUIT cuando existe), trabajos, características, cantidades y precios finales de cada lote y total acordado. No incluye notas internas de la ficha, observaciones generales de la nota, identificadores internos ni estado de producción o facturación. Las características libres de cada trabajo sí se incluyen: son parte de la descripción del trabajo acordado.

La generación ocurre en el servidor bajo la sesión del usuario con Diseño y las políticas de datos existentes. La respuesta es una descarga privada sin caché compartida; no se genera un enlace público ni se envía un mensaje automáticamente. El equipo descarga el archivo y lo comparte por el canal que corresponda.

La tipografía Noto Sans se distribuye con su licencia abierta en `public/brand/fonts`. Los recursos están incluidos explícitamente en el trazado de archivos de Next.js para el futuro despliegue. Se soporta texto español y se muestra un error si aparece un carácter no representable, en lugar de entregar un documento con texto ilegible.

Verificado con cuatro pruebas de PDF, extracción de contenido y límites y revisión visual de ejemplos ficticios de una y cuatro páginas. Se comprobaron acentos, logo, exclusión de datos internos, saltos de página, continuación de trabajos y total final. TypeScript y compilación productiva aprobados. La descarga desde la sesión real de la usuaria queda pendiente de su prueba manual. Los archivos de ejemplo están en `tmp/pdfs`, excluidos de Git.

## PDF del presupuesto

El detalle del presupuesto también ofrece «Descargar PDF para cliente», tanto para borradores como para aprobados. Si se consulta una versión anterior, se descarga exactamente esa versión y se la identifica como borrador; la aprobación solo corresponde a la versión actual aprobada. El nombre del archivo incluye el número PP y la versión.

Comparte el diseño, tipografía, botón de descarga y controles de acceso con la nota de pedido. Incluye destinatario y teléfono guardados en esa versión, trabajos, cantidades, precios finales de los lotes, total y observaciones/condiciones para el cliente. No incorpora datos actuales de la ficha que no se hubieran guardado en la cotización, ni comentarios internos de aprobación. El formulario explicita que las observaciones y condiciones son para el cliente.

Se agregó verificación de versiones históricas y estados y se revisaron visualmente ejemplos aprobados y borradores. La suite PDF tiene seis pruebas aprobadas. Recursos de logo y tipografías declarados para ambas rutas de descarga. El recorrido de descarga con sesión real sigue pendiente de revisión de la usuaria.

Para probar: asignarse Diseño, crear un presupuesto con dos trabajos, editar el borrador, consultar una versión anterior, registrar la aprobación y generar una nota con un cliente nuevo. Abrir su ficha y repetir otro pedido con el cliente existente. Luego comprobar que editar la ficha conserve los datos de la nota anterior.


### Notas directas y filtros

Las notas de pedido se pueden crear desde **Notas de pedido → Nueva nota de pedido**, sin presupuesto previo. Diseño selecciona un cliente existente o da de alta su ficha, carga de 1 a 50 trabajos, define el precio final de cada lote y confirma que el trabajo fue acordado. La creación es atómica e idempotente: un reintento no duplica la nota ni sus trabajos. Los datos del cliente se conservan como instantánea y los trabajos comienzan pendientes. No se genera un presupuesto ficticio. Las observaciones de la ficha y del pedido son internas y se excluyen del PDF.

La lista permite filtrar por cliente y fecha de creación desde/hasta, incluyendo los días completos según Argentina. Los filtros se conservan al paginar y se pueden limpiar. No se muestran estados Borrador/Aprobado en notas, ya que corresponden a presupuestos. Los errores de filtros no muestran resultados sin filtrar.

Migración: 20261025000800_direct_orders.sql. El origen quote_id/quote_version_id puede ser nulo; ambos deben estar presentes o ausentes. El circuito desde presupuestos aprobados se conserva.

Validación de esta entrega: TypeScript, 83 pruebas SQL, 3 pruebas de fechas y 6 pruebas de PDF aprobadas. La comprobación visual del formulario queda para la prueba manual.

La tabla y el detalle de notas muestran estado actual y avance por trabajos. Ver [Producción](produccion.md).
