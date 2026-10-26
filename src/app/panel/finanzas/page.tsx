import Link from "next/link";
import {requireFinance} from "@/features/finance/queries";
import {argentinaToday,type MonthData} from "@/features/finance/shared";
import {MovementsTable} from "@/features/finance/movements-table";
import {createSupabaseServerClient} from "@/lib/supabase/server";
import {Pagination,listParams} from "@/features/sales/list-controls";
import {formatMoney} from "@/features/sales/money";
export const metadata={title:"Finanzas | La Imprenta"};
export default async function FinancePage({searchParams}:{searchParams:Promise<{month?:string;page?:string;saved?:string}>}){
 await requireFinance();const options=await searchParams;const {page}=listParams(options);
 const month=options.month??argentinaToday().slice(0,7);
 const valid=/^[0-9]{4}-(0[1-9]|1[0-2])$/.test(month)&&Number(month.slice(0,4))>=1;
 const db=await createSupabaseServerClient();
 const [{data,error},{data:overdue,error:overdueError}]=await Promise.all([valid?db.rpc("finance_month",{p_month:month+"-01",p_offset:(page-1)*20}):Promise.resolve({data:null,error:null}),db.rpc("finance_orders",{p_status:"overdue"})]);
 if(error||overdueError)throw new Error("No pudimos cargar Finanzas.");const summary=data as MonthData|null;
 return <main className="users-page"><div className="users-heading"><div><span className="eyebrow">DINERO COBRADO Y PAGADO</span><h1>Finanzas.</h1></div><div className="form-actions"><Link className="button dark" href="/panel/finanzas/pedidos">Cobros y saldos ↗</Link><Link className="button secondary" href="/panel/finanzas/egresos/nuevo">+ Registrar egreso</Link></div></div>
 {options.saved==="1"&&<p className="success-note" role="status">Movimiento registrado.</p>}
 {overdue.total>0&&<p className="form-alert" role="status"><strong>{overdue.total} notas con saldo pendiente y 15 días o más desde su creación.</strong> <Link href="/panel/finanzas/pedidos?status=overdue">Ver atrasos ↗</Link></p>}
 <form className="business-card" method="get"><label>Mes del cobro o pago<input type="month" name="month" defaultValue={month} required/></label><button className="button dark">Ver mes</button></form>
 {!valid&&<p className="form-alert" role="alert">Ingresá un mes válido.</p>}
 {summary&&<><section className="business-card"><dl className="data-grid"><div><dt>Ingresos cobrados, incluidas señas</dt><dd>{formatMoney(summary.income)}</dd></div><div><dt>Egresos pagados</dt><dd>{formatMoney(summary.expenses)}</dd></div><div><dt>Diferencia del mes</dt><dd>{formatMoney(summary.net)}</dd></div></dl><p className="field-help">El mes se calcula con la fecha efectiva de cada cobro o pago. Una factura por sí sola no genera un ingreso.</p></section>{summary.movements.length?<MovementsTable movements={summary.movements}/>:<div className="empty-team"><h2>No hay movimientos en este mes.</h2></div>}<Pagination base="/panel/finanzas" page={page} count={summary.total} filters={{month}}/></>}
 </main>;
}
