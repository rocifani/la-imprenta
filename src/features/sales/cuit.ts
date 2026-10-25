export function formatCuit(value?: string) {
  return value && /^\d{11}$/.test(value) ? `${value.slice(0, 2)}-${value.slice(2, 10)}-${value.slice(10)}` : "Sin indicar";
}
