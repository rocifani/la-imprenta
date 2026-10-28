# Propuesta de mejoras — 27/10/2026

Estado: implementado en desarrollo, salvo el punto 6 (muestras JPG), postergado por indicación expresa de Rocío. No se realizaron commits ni despliegues.

## Reglas confirmadas

- Se intercambian las posiciones de Persona de contacto y CUIT en el formulario de cliente.
- El presupuesto para cliente muestra nombre del cliente y debajo persona de contacto.
- Las alternativas del presupuesto son completas y mutuamente excluyentes. Se aprueba una sola alternativa. Solo esa origina la nota y el importe acordado.
- El PDF del taller contiene solamente información de producción, sin precios, señas, cobros o saldos.
- Diseño realiza la asignación inicial al crear la nota. Los destinatarios deben ser usuarios activos con rol Producción. Producción deriva entre usuarios de su rol, con historial sin una cantidad fija de pases. La administradora mantiene la gestión de accesos.
- Se mantiene el cierre directo de trabajos: no se vuelve a agregar Iniciar trabajo. La asignación no modifica el avance, los cobros ni la facturación.
- El resumen PDF por cliente mantiene la regla anterior: únicamente trabajos terminados.

## 1. Cliente y contacto del presupuesto

Usar el formulario de cliente compartido para ordenar: Nombre/empresa, Persona de contacto, CUIT, Teléfono, Correo, Dirección. El PDF muestra la persona inmediatamente debajo del cliente. Guardar el contacto junto con la versión del presupuesto para conservar el documento histórico cuando se modifica la ficha. En consultas sin ficha, permitir cargar el contacto opcional. No inventar contactos ni completar documentos históricos con datos actuales sin distinguirlo.

## 2. Presupuestos con alternativas

Un presupuesto puede tener una sola propuesta, como hoy, o varias alternativas completas. Cada alternativa tiene nombre, trabajos, detalles y total propio. El detalle de presentación sigue siendo libre: no agregar un catálogo rígido ni una fórmula de precios. Ejemplo: A, 500 folletos en papel 115 g; B, 1000 folletos en papel 150 g. También puede haber varios trabajos dentro de cada alternativa.

El PDF muestra cada alternativa y su precio, sin sumar alternativas excluyentes como si fueran un único total. Al aprobar se elige obligatoriamente una alternativa; la versión y alternativa ganadoras quedan identificadas. La conversión copia solamente sus trabajos. Opciones no elegidas no generan producción ni deuda. No se edita una elección aprobada de manera que cambie retroactivamente una nota o sus cobros. Los presupuestos existentes equivalen a una propuesta única y mantienen su flujo.

## 3. Duplicación de notas

Acción visible en detalle de la nota y en cada fila del historial del cliente. Abre el alta precargada, para revisar antes de crear. Copia cliente, trabajos, descripciones y ficha técnica. Permite cambiar cantidad, precio y detalles. La cantidad no multiplica automáticamente el importe del lote: se conserva la regla actual y el usuario revisa los nuevos precios.

La copia tiene nueva numeración y fecha, trabajos pendientes y una referencia al pedido de origen. No hereda señas, pagos, facturación, cierres, comentarios de cierre, asignaciones ni historial de derivaciones. La seña y la asignación inicial son datos nuevos del alta. Una copia procedente de otra nota no utiliza el presupuesto original como si fuera una segunda conversión del mismo presupuesto. La reutilización de muestras queda pendiente junto con el punto 6.

## 4. Dos PDFs de nota

Acciones explícitas: PDF para cliente y PDF para taller. El primero conserva identificación, descripción comercial breve, cantidades, total, señas/cobros y saldo, excluyendo información interna. El segundo utiliza un formato cercano al formulario de referencia: encabezado, observaciones, composición con papel/copias/gramaje/terminaciones, impresión, rangos, block/talonario, medidas, rendimiento, hojas, clave de imprenta. Las muestras quedan pendientes. Por trabajo, páginas sucesivas con la misma identificación de nota y continuación cuando hace falta. Sin importes ni detalles financieros para Producción. Reutilizar composición de ficha, tipografías, marca y reglas de paginación, manteniendo proyecciones distintas según destinatario.

## 5. Carga de ficha técnica y numeración

Reorganizar el ingreso en el orden del formulario físico: identificación; tabla de composición; impresión/terminaciones; numeración y medidas; observaciones. Escritorio con filas compactas editables; celular con grupos de campos por componente y acciones claras. Evitar desplegar bloques largos antes de que se necesiten. Mantener la visualización que ya funciona, oscureciendo los valores de la ficha para igualar su contraste con numeración.

Cada rango pasa a Punto de venta, Desde y Hasta, todos textos para conservar ceros y prefijos. Mostrar por ejemplo 0003 - 000001 a 000100. Los rangos anteriores permanecen sin punto de venta hasta completarlos; no se asigna uno ficticio.

## 6. Muestras JPG — postergado

No implementado por decisión del usuario. El diseño siguiente se conserva solo como referencia futura.

Guardar archivos en Supabase Storage, con su referencia y metadatos en la base. Usar bucket privado con permisos de Diseño/Producción y acceso autenticado o enlaces de corta duración. Optimizar al subir, establecer límite de tamaño y dimensiones, validar tipo real y manejar reemplazos/eliminaciones y subidas incompletas. La imagen se presenta como muestra de referencia.

Propuesta inicial: carga por trabajo, agrupada dentro de la nota, con miniatura y ampliación; visible en el taller y en su PDF. Reutilización de muestras al duplicar sin duplicar binarios. El límite de cantidad/tamaño se definirá como parámetro de la aplicación, con un valor inicial conservador. La compresión no dependerá de transformaciones de imágenes pagas de Supabase.

La capacidad es limitada: Free publica 1 GB de Storage. Debe controlarse también la descarga de archivos. Fuentes: https://supabase.com/pricing y https://supabase.com/docs/guides/storage/buckets/fundamentals .

## 7. Asignaciones y derivaciones

Una nota tiene un responsable actual y un historial de pases. El historial registra origen, destino, quién lo hizo, fecha/hora y comentario. Los destinatarios se validan por rol activo en servidor y base, no solo en el selector. No se guardan diez columnas de operarios ni una lista con longitud fija.

Propuesta: comentario breve obligatorio al derivar, para dejar el motivo o lo que resta hacer. Evitar derivación a la misma persona o sobre una nota cerrada. Dos derivaciones simultáneas deben detectar que cambió el responsable en lugar de pisarse. Los responsables históricos se conservan aunque se desactive un usuario; las notas pendientes con ese responsable deben poder reasignarse.

En Producción, combinar filtros por cliente, responsable (mis asignadas, otros usuarios, sin asignar, todas) y estado. La asignación organiza el trabajo: los usuarios de Producción pueden consultar la cola de otros responsables. No agrega notificaciones externas ni convierte asignación en una etapa de producción. Las notas anteriores permanecen sin asignar hasta darles un responsable.

## 8. Botones y responsive

Revisar navegación, listados, filtros, altas/edición, diálogos, ficha del cliente, presupuestos, notas, taller y finanzas en móvil, tablet y escritorio. Unificar acción principal/secundaria, tamaños, iconos, carga/deshabilitado y confirmaciones. Comprobar botones largos, teclado, zoom, foco, textos extensos, tablas, áreas táctiles y contraste. Conservar scroll dentro de tablas técnicas cuando sea necesario, sin generar desbordamiento de toda la página.

Se unificaron espacios y ajuste de botones, acciones en móvil, radios y estados deshabilitados. La composición se ingresa como tabla compacta en escritorio y tarjetas en celular; los rangos tienen tres campos. Las tablas de consulta conservan scroll interno cuando lo necesitan. Se reforzó el contraste de la ficha.

## Orden de implementación propuesto

1. Orden de campos, contacto versionado en PDF, contraste y componentes compartidos de botones.
2. Ficha técnica simplificada, punto de venta y PDF del taller.
3. Duplicación de notas usando el alta compartida.
4. Alternativas completas de presupuesto, aprobación, conversión y verificación de importes.
5. Muestras en Storage: postergadas, fuera de esta implementación.
6. Asignaciones, historial y filtros de Producción.
7. Revisión visual integral de los flujos anteriores.

Las pruebas deben cubrir separación entre alternativas, versiones y contacto histórico, no duplicar pagos al copiar, privacidad de PDFs y archivos, conservación de rangos, permisos de responsables y colisiones entre derivaciones/cierres. Aplicar primero en desarrollo y verificar los documentos renderizados antes de pasar a producción.

## Validación de la implementación

- Migraciones 017 y 018: alternativas completas, contacto por versión, alternativa aprobada, responsable e historial, origen de duplicación y punto de venta. Compatibilidad con presupuestos y rangos anteriores. Aplicadas localmente y en el proyecto dev `llpwaezydncunkikgbfd`; producción no modificada.
- Base local: 208 pruebas SQL aprobadas, incluidas 30 del nuevo flujo. Cubren alternativa ganadora, importe del pedido, contacto histórico, copia sin pagos/cierres, permisos, filtros, pases y revisión concurrente.
- PDFs: 14 pruebas aprobadas; renderizados revisados visualmente y por extracción de texto/márgenes. Presupuesto con dos alternativas, ficha de taller de una página y caso extenso de cinco páginas. Proyección de taller sin dinero.
- Ficha técnica: tres pruebas, incluyendo punto de venta con ceros y límites. Dinero y fechas: tres pruebas cada módulo. Build de Next y TypeScript aprobados.
- Revisión visual con componentes reales y datos ficticios: cliente, presupuesto, duplicación, taller y egreso a 390, 768 y 1100 px. Sin desbordamiento horizontal. Se comprobó independencia de precios entre opciones y diálogo de pase con cancelación que conserva los datos. No equivale a una prueba integral autenticada de todos los flujos en Vercel.

## Uso

- Presupuesto: `Crear alternativa copiando esta`, nombrar cada opción, guardar y elegir una al aprobar.
- Duplicar: desde el detalle, listado de notas o historial del cliente; revisar cantidades, precios y ficha antes de crear.
- PDF: botones separados para cliente y taller; Producción accede al segundo desde su nota.
- Responsable: selección opcional al crear; pases desde Producción con indicación e historial. Filtros por cliente, estado y asignación. Solo operadores activos son candidatos.
