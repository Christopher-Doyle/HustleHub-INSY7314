const { test } = require('node:test');
const assert = require('node:assert/strict');
const { estimateAnnualTax } = require('../src/services/taxService.cjs');
test('tax estimate handles zero and primary threshold', () => { assert.equal(estimateAnnualTax(0).estimatedTax, 0); assert.equal(estimateAnnualTax(99000).estimatedTax, 0); });
test('tax estimate applies 2027 brackets and primary rebate', () => { assert.equal(estimateAnnualTax(245100).estimatedTax, 26298); assert.equal(estimateAnnualTax(383100).estimatedTax, 62178); });
test('tax estimate preserves cents and reconciles net', () => { const r=estimateAnnualTax(1000000.55); assert.equal(Math.round((r.estimatedTax+r.estimatedAfterTax)*100),100000055); });
test('tax estimate rejects invalid values', () => { for(const value of [-1,NaN,Infinity,'100']) assert.throws(()=>estimateAnnualTax(value)); });
