import { strict as assert } from 'assert';
import * as sheeteval from './sheeteval.mjs';


// (function() {
//   console.log("=== Testing formula evaluation ===")
//   let vals = {A: 1, B: 2, C: '=A+B'}

// })()

console.log("=== Testing that basic formulas work ===");

let result = sheeteval.exec({A: 1, B: 2, C: '=A+B'});
assert.deepEqual(result, {A: 1, B: 2, C: 3});


console.log("=== Testing that cycles don't cause issues ===");
result = sheeteval.exec({A: '=C', B: '=A', C: '=B'});
assert.deepEqual(result, {A: NaN, B: NaN, C: NaN});

console.log('passed!');