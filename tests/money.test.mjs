import test from "node:test";
import assert from "node:assert/strict";
import { moneyToCents } from "../src/features/sales/money.ts";

test("Acepta pesos con coma, punto decimal o miles argentinos", () => {
  for (const [input, expected] of [["96400", 9640000], ["96400,50", 9640050], ["96.400,50", 9640050], ["96400.50", 9640050], ["96.400", 9640000], ["0,01", 1]]) {
    assert.equal(moneyToCents(input), expected, input);
  }
});

test("Rechaza importes inválidos, negativos, cero y más de dos decimales", () => {
  for (const input of ["", "0", "-100", "1,234", "2.2.2", "1e3", "NaN", "Infinity", "10000000000", "1,2,3"]) {
    assert.equal(moneyToCents(input), null, input);
  }
});

test("La suma de precios de lotes utiliza centavos exactos", () => {
  assert.equal(moneyToCents("0,10") + moneyToCents("0,20"), 30);
});
