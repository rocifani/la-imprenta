import Link from "next/link";
import {requireFinance} from "@/features/finance/queries";
import {MovementForm} from "@/features/finance/movement-form";
export const metadata={title:"Registrar egreso | La Imprenta"};
export default async function NewExpensePage(){await requireFinance();return <main className="business-page"><Link className="back-link" href="/panel/finanzas">← Finanzas</Link><h1>Registrar egreso.</h1><p className="muted">Compras de papel, servicios y otros gastos ya pagados.</p><section className="business-card"><MovementForm id={crypto.randomUUID()}/></section></main>;}
