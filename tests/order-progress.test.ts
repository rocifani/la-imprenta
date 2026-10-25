import test from "node:test";
import assert from "node:assert/strict";
import {orderProgress} from "../src/features/sales/order-progress";
test("Una nota nueva comienza confirmada",()=>assert.equal(orderProgress([{production_status:"pending"}]).label,"Confirmada"));
test("Un cierre parcial indica una nota parcialmente terminada",()=>{const progress=orderProgress([{production_status:"completed"},{production_status:"pending"}]);assert.equal(progress.label,"Parcialmente terminada");assert.equal(progress.completed,1);assert.equal(progress.total,2);});
test("Todos los trabajos deben estar completos para terminar la nota",()=>assert.equal(orderProgress([{production_status:"completed"},{production_status:"completed"}]).label,"Terminada"));
test("Facturación no oculta el avance independiente de producción",()=>{const progress=orderProgress([{production_status:"pending"}],true);assert.equal(progress.label,"Facturada");assert.equal(progress.productionLabel,"Confirmada");assert.equal(progress.completed,0);});
test("Una lista vacía nunca se presenta como trabajo terminado",()=>assert.equal(orderProgress([]).label,"Confirmada"));
