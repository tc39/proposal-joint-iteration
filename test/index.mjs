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
    ], { longest: true })), [
      [0, 1],
      [undefined, 2],
    ]);
  });

  await t.test('strict', () => {
    let result = 
      Iterator.zip([
        [0],
        [1, 2],
      ], { strict: true });
    assert.throws(() => {
      Array.from(result);
    }, RangeError);
  });
});

test('basic named', async t => {
  await t.test('shortest', () => {
    assert.deepEqual(Array.from(Iterator.zip({
      a: [0],
      b: [1, 2],
    })), [
      { a: 0,  b: 1 },
    ]);
  });

  await t.test('equiv', () => {
    assert.deepEqual(Array.from(Iterator.zip({
      a: [0, 1, 2],
      b: [3, 4, 5],
      c: [6, 7, 8],
    })), [
      { a: 0, b: 3, c: 6 },
      { a: 1, b: 4, c: 7 },
      { a: 2, b: 5, c: 8 },
    ]);
  });

  await t.test('empty', () => {
    assert.deepEqual(Array.from(Iterator.zip({})), []);
  });

  await t.test('longest', () => {
    assert.deepEqual(Array.from(Iterator.zip({
      a: [0],
      b: [1, 2],
    }, { longest: true })), [
      { a: 0, b: 1 },
      { a: undefined, b: 2 },
    ]);
  });

  await t.test('strict', () => {
    let result = 
      Iterator.zip({
        a: [0],
        b: [1, 2],
      }, { strict: true });
    assert.throws(() => {
      Array.from(result);
    }, RangeError);
  });
});

test('fillers', async t => {
  await t.test('positional', () => {
    const fillers = [{}, {}, {}, {}];

    assert.deepEqual(Array.from(Iterator.zip([
      [0],
      [1, 2, 3],
    ], { longest: true, fillers })), [
      [0, 1],
      [fillers[0], 2],
      [fillers[0], 3],
    ]);

    assert.deepEqual(Array.from(Iterator.zip([
      [0],
      [1, 2, 3],
      [4, 5],
      [],
    ], { longest: true, fillers })), [
      [0, 1, 4, fillers[3]],
      [fillers[0], 2, 5, fillers[3]],
      [fillers[0], 3, fillers[2], fillers[3]],
    ]);
  });

  await t.test('named', () => {
    const A_FILLER = {};
    const B_FILLER = {};
    const C_FILLER = {};
    const D_FILLER = {};

    const fillers = {
      a: A_FILLER,
      b: B_FILLER,
      c: C_FILLER,
      d: D_FILLER
    };

    assert.deepEqual(Array.from(Iterator.zip({
      a: [0],
      b: [1, 2, 3],
    }, { longest: true, fillers })), [
      { a: 0, b: 1 },
      { a: A_FILLER, b: 2 },
      { a: A_FILLER, b: 3 },
    ]);

    assert.deepEqual(Array.from(Iterator.zip({
      a: [0],
      b: [1, 2, 3],
      c: [4, 5],
      d: [],
    }, { longest: true, fillers })), [
      { a: 0, b: 1, c: 4, d: D_FILLER },
      { a: A_FILLER, b: 2, c: 5, d: D_FILLER },
      { a: A_FILLER, b: 3, c: C_FILLER, d: D_FILLER },
    ]);
  });
});