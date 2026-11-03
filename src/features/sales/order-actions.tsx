import { PendingLink } from "@/components/pending-link";
import {DeleteOrderForm} from "./delete-order-form";
import Link from "next/link";
import { DownloadPdf } from "./download-pdf";
import { documentNumber } from "./money";

export function OrderActions({ id, number, revision=1, blocked=null, deleteBlocked=blocked }: { id: string; number: number; revision?:number; blocked?:string|null; deleteBlocked?:string|null }) {
  return <section className="order-actions" aria-label="Acciones de la nota de pedido">
    <div className="order-action-group">
      <h2>Gestionar nota</h2>
      {!blocked&&<Link className="button dark" href={`/panel/pedidos/${id}/editar`}>Editar nota e ítems</Link>}
      <Link className="button secondary" href={`/panel/pedidos/nuevo?duplicate_from=${id}`}>Duplicar nota</Link>
    </div>
    <div className="order-action-group">
      <h2>Documentos PDF</h2>
      <DownloadPdf variant="secondary" label="PDF para cliente ↓" href={`/panel/pedidos/${id}/pdf`} filename={`nota-pedido-${documentNumber("NP", number)}.pdf`} />
      <DownloadPdf variant="secondary" label="PDF para taller ↓" href={`/panel/pedidos/${id}/taller/pdf`} filename={`ficha-taller-${number}.pdf`} />
    </div>
    {blocked&&<p className="field-help order-edit-block" role="status">{blocked}</p>}
    {deleteBlocked?(deleteBlocked!==blocked&&<p className="field-help order-edit-block" role="status">{deleteBlocked}</p>):<div className="order-delete-group"><p className="field-help">El borrado es definitivo y requiere confirmación.</p><DeleteOrderForm id={id} number={number} revision={revision}/></div>}
  </section>;
}

export function OrderRowActions({ id, number }: { id: string; number: number }) {
  return <div className="order-row-actions" aria-label={`Acciones de ${documentNumber("NP", number)}`}>
    <PendingLink className="button secondary" href={`/panel/pedidos/${id}`} pendingLabel="Abriendo nota…">Ver nota ↗</PendingLink>
    <Link className="button secondary" href={`/panel/pedidos/nuevo?duplicate_from=${id}`}>Duplicar</Link>
  </div>;
}
