import { formatMoney } from "./money";
import type { QuoteItem, OrderItem } from "./types";

const statuses = { pending: "Pendiente", in_progress: "En proceso", completed: "Terminado" };

export function ItemTable({ items }: { items: (QuoteItem | OrderItem)[] }) {
  return <div className="users-table-wrap"><table className="users-table"><caption className="visually-hidden">Productos del trabajo y precio total de cada lote</caption><thead><tr><th scope="col">Producto</th><th scope="col">Cantidad</th><th scope="col">Total del lote · ARS</th></tr></thead><tbody>{items.map((item, index) => <tr key={index}><th scope="row"><strong className="member-name">{item.description}</strong><p className="specification-text">{item.specifications || "Sin características adicionales."}</p>{"production_status" in item && <span className="pill">{statuses[item.production_status]}</span>}</th><td>{item.quantity.toLocaleString("es-AR")}</td><td className="money-cell">{formatMoney(item.amount)}</td></tr>)}</tbody></table></div>;
}
