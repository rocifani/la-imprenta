# Gestión de La Imprenta

Vocabulario inicial para conversar con la imprenta. Las distinciones propuestas se validarán durante el relevamiento.

## Lenguaje

**Cliente**: Persona o empresa que consulta o encarga un trabajo a la imprenta. No tiene cuenta de acceso a la aplicación; al confirmar un pedido puede registrarse en la gestión interna.

**Solicitud de presupuesto**: Consulta del cliente con lo que necesita imprimir, todavía sin una cotización emitida por la imprenta.
_Evitar_: Presupuesto, cuando solo se recibió una consulta.

**Presupuesto**: Cotización preparada por la imprenta para un trabajo, con sus características y precio.

**Presupuesto directo**: Presupuesto creado por el diseñador desde la gestión interna sin una solicitud pública ni contacto previo por WhatsApp. Es el mismo documento comercial, con otro origen de carga.

**Nota de pedido**: Documento interno que identifica un encargo y reúne los datos necesarios para realizarlo.
_Evitar_: Factura.

**Trabajo**: Encargo de impresión que debe producir la imprenta. Una nota puede reunir varios trabajos, cada uno con avance de producción propio.

**Trabajo del pedido**: Ítem de una nota de pedido que puede producirse y marcarse como terminado por separado.

**Cierre de nota completa**: Acción del operario que marca como terminados todos los trabajos pendientes de una nota, conservando los cierres anteriores.

**Muestra del trabajo**: Referencia visual del resultado esperado. No implica que sea el archivo definitivo para imprimir ni que esté aprobada por el cliente.

**Diseñador**: Rol interno que puede preparar presupuestos y notas de pedido.

**Operario**: Rol interno que realiza el trabajo y registra su terminación.

**Facturador**: Rol interno que realiza la facturación fuera de la aplicación y registra que el trabajo fue facturado.

**Finanzas**: Rol interno destinado a la gestión de cobros, pagos, compras y consulta financiera. Sus permisos específicos sobre costos y correcciones están pendientes de definición.

**Usuario interno**: Persona con acceso a la gestión de la imprenta. Puede tener varios roles a la vez.

**Administrador**: Rol reservado a una única cuenta, la de la creadora de la web, responsable de gestionar usuarios y asignar sus roles. Sus permisos sobre otras funciones del negocio quedan por definir.

**Facturado**: Condición que registra una facturación realizada externamente. No equivale a cobrado.

**Costo de referencia**: Valor configurable de un material o servicio utilizado para preparar presupuestos.

**Tarifa estándar**: Precio de venta de referencia para un trabajo con características y cantidad definidas, durante una vigencia. Puede corresponder a una unidad o a un lote.

**Precio sugerido**: Importe propuesto como referencia a partir de una tarifa estándar aplicable. Puede ser modificado por quien prepara el presupuesto.

**Precio cotizado**: Importe final definido por quien prepara el presupuesto para las características de ese trabajo. Puede provenir de una tarifa, de una tarifa ajustada o de una cotización manual.

**Trabajo personalizado**: Trabajo cuyas características requieren cotización particular y no están cubiertas completamente por una tarifa estándar.

**Ingreso de dinero**: Dinero efectivamente recibido por la imprenta.
_Evitar_: Facturado o presupuestado como sinónimos de cobrado.

**Egreso de dinero**: Dinero efectivamente pagado por la imprenta.
_Evitar_: Costo estimado como sinónimo de pago realizado.

**Seña**: Cobro anticipado de una parte del importe de un pedido.

**Saldo pendiente del pedido**: Importe confirmado de un pedido que todavía falta cobrar, descontando los cobros y señas aplicados.

**Saldo pendiente del cliente**: Total que queda por cobrar al cliente considerando sus pedidos y cobros asociados. No implica necesariamente que haya vencido el plazo de pago.

**Ficha del cliente**: Registro interno que reúne la identificación del cliente, su historial de pedidos y su saldo pendiente. No es una cuenta de acceso del cliente.

**Atraso de pago**: Situación de un importe pendiente que superó el plazo de pago acordado. El hito desde el que se cuenta y los posibles días de gracia están pendientes de relevamiento.

**Recargo por atraso**: Importe adicional por demora de pago según una regla configurable. Su cálculo y modalidad de aplicación están pendientes de definición.

**Compra**: Adquisición de materiales o servicios para la imprenta. Su registro no implica por sí mismo que se haya pagado.


**Descripción para el cliente**: Texto simple por trabajo que aparece en los documentos comerciales. Se mantiene separado de las indicaciones internas y la ficha técnica.

**Ficha técnica de producción**: Datos internos de composición, papel, copias, terminaciones, numeración y medidas por trabajo. Diseño la completa; el taller la consulta. No forma parte de los PDFs del cliente.

**Resumen de trabajos terminados del cliente**: Documento comercial con trabajos efectivamente terminados y saldos por nota completa. Excluye trabajos pendientes. Un saldo de nota no se distribuye entre trabajos sin una regla de aplicación de cobros.
