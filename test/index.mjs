import { test } from 'node:test';
import * as assert from 'node:assert/strict';
import '../lib/index.js';

test('basic positional', async t => {
  await t.test('shortest', () => {
    assert.deepEqual(Array.from(Iterator.zip([
      [0],
      [1, 2],
    ])), [
      [0, 1],
    ]);
  });

  await t.test('equiv', () => {
    assert.deepEqual(Array.from(Iterator.zip([
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
    ])), [
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
    ]);
  });

  await t.test('empty', () => {
    assert.deepEqual(Array.from(Iterator.zip([])), []);
  });

  await t.test('longest', () => {
    assert.deepEqual(Array.from(Iterator.zip([
      [0],
      [1, 2],
    ], { mode: 'longest' })), [
      [0, 1],
      [undefined, 2],
    ]);
  });

  await t.test('strict', () => {
    let result =
      Iterator.zip([
        [0],
        [1, 2],
      ], { mode: 'strict' });
    assert.throws(() => {
      Array.from(result);
    }, TypeError);
  });
});

test('basic named', async t => {
  await t.test('shortest', () => {
    assert.deepEqual(Array.from(Iterator.zipKeyed({
      a: [0],
      b: [1, 2],
    })), [
      { a: 0,  b: 1, __proto__: null },
    ]);
  });

  await t.test('equiv', () => {
    assert.deepEqual(Array.from(Iterator.zipKeyed({
      a: [0, 1, 2],
      b: [3, 4, 5],
      c: [6, 7, 8],
    })), [
      { a: 0, b: 3, c: 6, __proto__: null },
      { a: 1, b: 4, c: 7, __proto__: null },
      { a: 2, b: 5, c: 8, __proto__: null },
    ]);
  });

  await t.test('empty', () => {
    assert.deepEqual(Array.from(Iterator.zipKeyed({})), []);
  });

  await t.test('longest', () => {
    assert.deepEqual(Array.from(Iterator.zipKeyed({
      a: [0],
      b: [1, 2],
    }, { mode: 'longest' })), [
      { a: 0, b: 1, __proto__: null },
      { a: undefined, b: 2, __proto__: null },
    ]);
  });

  await t.test('strict', () => {
    let result =
      Iterator.zipKeyed({
        a: [0],
        b: [1, 2],
      }, { mode: 'strict' });
    assert.throws(() => {
      Array.from(result);
    }, TypeError);
  });
});

test('padding', async t => {
  await t.test('positional', () => {
    const padding = [{}, {}, {}, {}];

    assert.deepEqual(Array.from(Iterator.zip([
      [0],
      [1, 2, 3],
    ], { mode: 'longest', padding })), [
      [0, 1],
      [padding[0], 2],
      [padding[0], 3],
    ]);

    assert.deepEqual(Array.from(Iterator.zip([
      [0],
      [1, 2, 3],
      [4, 5],
      [],
    ], { mode: 'longest', padding })), [
      [0, 1, 4, padding[3]],
      [padding[0], 2, 5, padding[3]],
      [padding[0], 3, padding[2], padding[3]],
    ]);
  });

  await t.test('named', () => {
    const A_PADDING = {};
    const B_PADDING = {};
    const C_PADDING = {};
    const D_PADDING = {};

    const padding = {
      a: A_PADDING,
      b: B_PADDING,
      c: C_PADDING,
      d: D_PADDING
    };

    assert.deepEqual(Array.from(Iterator.zipKeyed({
      a: [0],
      b: [1, 2, 3],
    }, { mode: 'longest', padding })), [
      { a: 0, b: 1, __proto__: null },
      { a: A_PADDING, b: 2, __proto__: null },
      { a: A_PADDING, b: 3, __proto__: null },
    ]);

    assert.deepEqual(Array.from(Iterator.zipKeyed({
      a: [0],
      b: [1, 2, 3],
      c: [4, 5],
      d: [],
    }, { mode: 'longest', padding })), [
      { a: 0, b: 1, c: 4, d: D_PADDING, __proto__: null },
      { a: A_PADDING, b: 2, c: 5, d: D_PADDING, __proto__: null },
      { a: A_PADDING, b: 3, c: C_PADDING, d: D_PADDING, __proto__: null },
    ]);
  });
});
