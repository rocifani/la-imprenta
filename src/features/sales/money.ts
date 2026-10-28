export function moneyToCents(input: string): number | null {
  let normalized = input.trim();
  if (normalized.includes(",")) {
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+),\d{1,2}$/.test(normalized)) return null;
    normalized = normalized.replaceAll(".", "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(normalized)) normalized = normalized.replaceAll(".", "");
  if (!/^\d{1,10}(?:\.\d{1,2})?$/.test(normalized)) return null;
  const [whole, decimals = ""] = normalized.split(".");
  const cents = Number(whole) * 100 + Number(decimals.padEnd(2, "0"));
  return cents > 0 && Number.isSafeInteger(cents) ? cents : null;
}

export function formatMoney(value: string | number) {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", minimumFractionDigits: 2 }).format(Number(value));
}

export function documentNumber(prefix: string, number: number) {
  return `${prefix}-${String(number).padStart(6, "0")}`;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "America/Argentina/Buenos_Aires" }).format(new Date(value));
}
