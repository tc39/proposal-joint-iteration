import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import '../lib/index.js';

test('basic example', () => {
  const o = {};
  assert.equal(o, Iterator.zip(o));
});