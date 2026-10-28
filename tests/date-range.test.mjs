import test from "node:test";
import assert from "node:assert/strict";
import { quoteDateRange } from "../src/features/sales/date-range.ts";

test("Incluye el día completo en Argentina, aunque el final sea otro día en UTC", () => {
  assert.deepEqual(quoteDateRange("2026-10-25", "2026-10-25"), { start: "2026-10-25T03:00:00.000Z", end: "2026-10-26T03:00:00.000Z" });
});
test("Permite rangos abiertos y cruces de mes", () => {
  assert.deepEqual(quoteDateRange("", "2026-10-31"), { start: undefined, end: "2026-11-01T03:00:00.000Z" });
  assert.deepEqual(quoteDateRange("2026-10-25", ""), { start: "2026-10-25T03:00:00.000Z", end: undefined });
});
test("Rechaza fechas imposibles y rangos invertidos", () => {
  for (const dates of [["2026-02-30", ""], ["2026-10-26", "2026-10-25"], ["texto", ""], ["0000-01-01", ""]]) assert.ok(quoteDateRange(...dates).error);
});
