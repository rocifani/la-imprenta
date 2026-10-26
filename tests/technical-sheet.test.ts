import test from "node:test";
import assert from "node:assert/strict";
import {validTechnicalSheet} from "../src/features/production/technical-sheet";
test("Acepta fichas vacías y numeración con ceros",()=>{assert.equal(validTechnicalSheet({}),true);assert.equal(validTechnicalSheet({number_ranges:[{from:"000001",to:"000100"}],composition:[{paper_color:"Blanco",grammage:"80"}]}),true)});
test("Rechaza estructuras o campos no admitidos",()=>{for(const value of [null,[],{unknown:"dato"},{composition:[null]},{number_ranges:[{}]},{composition:Array.from({length:21},()=>({}))},{observations:"x".repeat(2001)}])assert.equal(validTechnicalSheet(value),false)});
