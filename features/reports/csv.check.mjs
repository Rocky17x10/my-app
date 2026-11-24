// Self-check for csv.ts: `node features/reports/csv.check.mjs` (Node 22.18+ runs the .ts import directly).
import assert from 'node:assert/strict';

import { toCsv } from './csv.ts';

assert.equal(toCsv(['a', 'b'], [['plain', 3]]), 'a,b\r\nplain,3');
assert.equal(toCsv(['x'], [['comma, here'], ['say "hi"'], ['two\nlines'], [' padded ']]), 'x\r\n"comma, here"\r\n"say ""hi"""\r\n"two\nlines"\r\n" padded "');
assert.equal(toCsv(['x'], [[null], [undefined], ['']]), 'x\r\n\r\n\r\n');
assert.equal(toCsv(['x'], [['=SUM(A1)'], ['+1'], ['@cmd'], [-5]]), "x\r\n'=SUM(A1)\r\n'+1\r\n'@cmd\r\n-5");
assert.equal(toCsv(['x'], [['=a,b']]), `x\r\n"'=a,b"`);
console.log('csv.ts ok');
