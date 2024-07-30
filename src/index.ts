declare var Iterator: {};

if (typeof Iterator === 'undefined' || Iterator == null) {
  globalThis.Iterator = {};
}

const DEFAULT_FILLER = undefined;

function getIteratorFlattenable(obj: any, stringHandling: 'iterate-strings' | 'reject-strings'): Iterator<unknown> {
  if (Object(obj) !== obj) {
    if (stringHandling === 'reject-strings' || typeof obj != 'string') {
      throw new TypeError;
    }
  }
  let iter = Symbol.iterator in obj ? obj[Symbol.iterator]() : obj as Iterator<unknown>;
  if (Object(iter) !== iter) {
    throw new TypeError;
  }
  return iter;
}

function isObject(obj: unknown): obj is Object {
  return Object(obj) === obj;
}

function getOwnEnumerablePropertyKeys<O extends Object>(obj: O): Array<keyof O> {
  let descriptors = Object.getOwnPropertyDescriptors(obj);
  let keys = Reflect.ownKeys(obj) as Array<keyof O>;
  return keys.filter(k => descriptors[k].enumerable);
}

interface ZipShortestOptions {
  mode?: 'shortest',
}
interface ZipLongestOptions<F> {
  mode: 'longest',
  padding?: F,
}
interface ZipStrictOptions {
  mode: 'strict',
};
type ZipOptions<F> = ZipShortestOptions | ZipLongestOptions<F> | ZipStrictOptions;

type IteratorOrIterable<A> = Iterable<A> | Iterator<A>
type Iteratee<A extends IteratorOrIterable<unknown>> = A extends Iterable<infer X> ? X : A extends Iterator<infer X> ? X : never
type NamedIteratees<P  extends { readonly [item: PropertyKey]: IteratorOrIterable<unknown> }> = { -readonly [k in keyof P]: Iteratee<P[k]> };
// this layer of indirection is necessary until https://github.com/microsoft/TypeScript/issues/27995 gets fixed
type IterateesOfTupleOfIterables<T extends readonly IteratorOrIterable<unknown>[]> = { -readonly [K in keyof T]: Iteratee<T[K]> }

type Mode = 'shortest' | 'longest' | 'strict';

function getMode(options: ZipOptions<any>): Mode {
  let mode = (options as ZipOptions<never>).mode;
  if (mode === undefined) {
    mode = 'shortest';
  }
  if (mode !== 'shortest' && mode !== 'longest' && mode !== 'strict') {
    throw new TypeError;
  }
  return mode as Mode;
}

function zip(p: readonly [], o?: ZipOptions<Iterable<unknown>>): IterableIterator<never>
function zip<P extends readonly IteratorOrIterable<unknown>[] | readonly []>(p: P, o?: ZipOptions<IterateesOfTupleOfIterables<P>>): IterableIterator<IterateesOfTupleOfIterables<P>>
function zip<P extends Iterable<IteratorOrIterable<unknown>>>(p: P, o?: ZipOptions<Iteratee<P>>): IterableIterator<Array<Iteratee<Iteratee<P>>>>
function* zip(input: unknown, options?: unknown): IterableIterator<Array<unknown> | { [k: PropertyKey]: unknown }> {
  if (!isObject(input)) {
    throw new TypeError;
  }
  if (options === undefined) {
    options = Object.create(null);
  }
  if (!isObject(options)) {
    throw new TypeError;
  }
  let mode = getMode(options);
  let iters: Array<Iterator<unknown>> = [];
  let padding: unknown[];
  try {
    for (let iter of (input as Iterable<unknown>)) {
      iters.push(getIteratorFlattenable(iter, 'iterate-strings'));
    }
    padding = iters.map(() => DEFAULT_FILLER);
    if (mode === 'longest') {
      let tmp = (options as ZipLongestOptions<Iterable<unknown>>).padding;
      if (tmp != null) {
        padding = Array.from(tmp);
      }
    }
  } catch (e) {
    for (let iter of iters) {
      try {
        iter.return?.();
      } catch {}
    }
    throw e;
  }
  yield* zipCore(iters, mode, padding);
}

function zipKeyed<P extends { readonly [item: PropertyKey]: IteratorOrIterable<unknown> }>(p: P, o?: ZipOptions<NamedIteratees<P>>): IterableIterator<NamedIteratees<P>>
function* zipKeyed(input: unknown, options?: unknown): IterableIterator<Array<unknown> | { [k: PropertyKey]: unknown }> {
  if (!isObject(input)) {
    throw new TypeError;
  }
  if (options === undefined) {
    options = Object.create(null);
  }
  if (!isObject(options)) {
    throw new TypeError;
  }
  let mode = getMode(options);
  let keys = getOwnEnumerablePropertyKeys(input);
  let padding: Array<unknown> = keys.map(() => DEFAULT_FILLER);
  let iters: Array<Iterator<unknown>> = [];
  try {
    for (let k of keys) {
      iters.push(getIteratorFlattenable(input[k], 'iterate-strings'));
    }
    if (mode === 'longest') {
      let tmp = (options as ZipLongestOptions<{ [k: PropertyKey]: unknown }>).padding;
      if (tmp != null) {
        padding = keys.map(k => tmp![k]);
      }
    }
  } catch (e) {
    for (let iter of iters) {
      try {
        iter.return?.();
      } catch {}
    }
    throw e;
  }
  for (let result of zipCore(iters, mode, padding)) {
    yield Object.fromEntries(result.map((r, i) => [keys[i], r]));
  }
}

type Nexts = Array<{ done: false, next: () => { done?: boolean, value?: unknown } } | { done: true, next?: void }>;

function getResults(iters: Array<Iterator<unknown>>, nexts: Nexts): Array<{ done: true, value?: undefined } | { done: false, value: unknown }> {
  return nexts.map(({done, next}, i) => {
    if (done) return { done: true };
    try {
      let v = next.call(iters[i]);
      return v.done ? { done: true } : { done: false, value: v.value };
    } catch (e) {
      for (let k = 0; k < nexts.length; ++k) {
        if (k === i) continue;
        try {
          if (!nexts[k]!.done) {
            iters[k]!.return?.();
          }
        } catch {}
      }
      throw e;
    }
  });
}

function* zipCore(iters: Array<Iterator<unknown>>, mode: 'shortest' | 'longest' | 'strict', padding: Array<unknown>) {
  if (iters.length === 0) return;
  let nexts: Nexts = iters.map((iter, i) => {
    try {
      return ({ done: false, next: iter.next });
    } catch (e) {
      for (let k = 0; k < iters.length; ++k) {
        if (k === i) continue;
        try {
          iters[k]!.return?.();
        } catch {}
      }
      throw e;
    }
  });
  while (true) {
    let results = getResults(iters, nexts);
    results.forEach((r, i) => {
      if (r.done) {
        nexts[i] = { done: true };
      }
    });
    switch (mode) {
      case 'shortest':
        if (results.some(r => r.done)) return;
        yield results.map(r => r.value);
        break;
      case 'longest':
        if (results.every(r => r.done)) return;
        yield results.map((r, i) => r.done ? padding[i] : r.value);
        break;
      case 'strict':
        if (results.every(r => r.done)) return;
        if (results.some(r => r.done)) {
          throw new RangeError;
        }
        yield results.map(r => r.value);
        break;
    }
  }
}

Object.defineProperty(Iterator, 'zip', {
  configurable: true,
  writable: true,
  enumerable: false,
  value: zip,
});

Object.defineProperty(Iterator, 'zipKeyed', {
  configurable: true,
  writable: true,
  enumerable: false,
  value: zipKeyed,
});
