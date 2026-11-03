import { moneyToCents } from "./money";

export function vatCents(base: number) {
  return Math.round(base * 21 / 100);
}

export function orderPricing(items: { amount: string; with_vat?: boolean }[]) {
  let base = 0;
  let vat = 0;
  for (const item of items) {
    const amount = moneyToCents(item.amount);
    if (amount === null) return null;
    base += amount;
    if (item.with_vat) vat += vatCents(amount);
  }
  return { base, vat, total: base + vat };
}

export function orderItemBase(item: { amount: string | number; vat_amount?: string | number }) {
  return (Math.round(Number(item.amount) * 100) - Math.round(Number(item.vat_amount ?? 0) * 100)) / 100;
}
