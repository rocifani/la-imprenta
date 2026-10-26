# Finanzas: cobros, señas, egresos y atrasos

## Dinero registrado

El rol Finanzas habilita un resumen mensual, cobros y saldos por nota y alta de egresos ya pagados. Cada movimiento tiene importe positivo en ARS, fecha efectiva, medio de pago, descripción, autor y fecha de registro. Las fechas futuras se rechazan porque se registran movimientos realizados. El mes se calcula por fecha efectiva, no por fecha de factura ni de creación de la nota.

Las señas opcionales se cargan al crear una nota directa o desde un presupuesto aprobado, por el rol Diseño. La creación de nota, cliente, trabajos y seña es atómica: si la seña no es válida, no queda una nota o ficha parcial. Un reintento no agrega otra seña, incluso si el primer envío no tenía seña. Los cobros posteriores se registran desde Finanzas.

El saldo se deriva del total acordado menos la suma de señas y cobros. No se guarda un saldo editable ni se duplica la seña. Se bloquean cobros superiores al saldo; ajustes, devoluciones, saldos a favor y correcciones de movimientos quedan pendientes de definición. Los egresos permiten registrar compras de papel, servicios y otros gastos mediante su descripción, sin stock ni cuentas a pagar.

## Atraso confirmado en el relevamiento

Una nota aparece en atrasos al cumplir **15 días desde su creación**, siempre que tenga saldo pendiente. El criterio es independiente de producción y facturación. El aviso se calcula al consultar Finanzas y desaparece al saldar la nota. No aumenta el precio, no genera intereses ni envía notificaciones externas. Los recargos automáticos no se implementan sin una regla adicional.

## Ficha y PDF

La ficha del cliente muestra total acordado, cobrado y saldo sobre todos sus pedidos. El detalle de la nota muestra seña, cobrado y saldo. El PDF incluye seña, otros cobros registrados y saldo pendiente a la fecha de emisión. Excluye los comentarios financieros, datos de auditoría y observaciones internas.

## Permisos y comprobación

Los movimientos no tienen acceso directo desde el cliente de Supabase. Los RPC comprueban rol activo. Diseño consulta resúmenes por nota y cliente y registra solo la seña durante el alta. Finanzas registra cobros y egresos y consulta los reportes; no obtiene acceso a la gestión comercial ni modifica los importes acordados. Administrador debe asignarse Finanzas desde Usuarios para usar el módulo.

Migración: 20261025001400_finance.sql. Se probaron transacciones, reintentos, límites de cobro, resumen mensual, permisos y el umbral exacto de 15 días. El PDF con seña y saldo fue generado, extraído y revisado visualmente. La compilación y 156 pruebas SQL y 7 pruebas PDF pasaron.

Para probar: crear una nota con seña, descargar el PDF, abrir Finanzas con su rol asignado, registrar un pago parcial y el saldo, registrar un egreso y consultar el mes. Las notas anteriores se consideran sin cobros registrados hasta ingresar sus pagos históricos; no se infieren pagos desde facturación.
