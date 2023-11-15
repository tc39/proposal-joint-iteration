import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import '../lib/index.js';

test('basic example', () => {
  assert.deepEqual(Array.from(Iterator.zip([
    [0, 1, 2],
    [3, 4, 5],
  ])), [
    [0, 3],
    [1, 4],
    [2, 5],
  ]);
});