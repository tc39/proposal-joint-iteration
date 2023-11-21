declare var Iterator: {};

if (typeof Iterator === 'undefined' || Iterator == null) {
  globalThis.Iterator = {};
}

const DEFAULT_FILLER = void 0;

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
  longest?: false,
  strict?: false,
}
interface ZipLongestOptions<F> {
  longest: true,
  strict?: false,
  fillers?: F,
}
interface ZipStrictOptions {
  longest?: false,
  strict: true,
};
type ZipOptions<F> = ZipShortestOptions | ZipLongestOptions<F> | ZipStrictOptions;

type IteratorOrIterable<A> = Iterable<A> | Iterator<A>
type Iteratee<A extends IteratorOrIterable<unknown>> = A extends Iterable<infer X> ? X : A extends Iterator<infer X> ? X : never
type NamedIteratees<P  extends { readonly [item: PropertyKey]: IteratorOrIterable<unknown> }> = { -readonly [k in keyof P]: Iteratee<P[k]> };
// this layer of indirection is necessary until https://github.com/microsoft/TypeScript/issues/27995 gets fixed
type IterateesOfTupleOfIterables<T extends readonly IteratorOrIterable<unknown>[]> = { -readonly [K in keyof T]: Iteratee<T[K]> }

function zipImpl(p: readonly [], o?: ZipOptions<Iterable<unknown>>): IterableIterator<never>
function zipImpl<P extends readonly IteratorOrIterable<unknown>[] | readonly []>(p: P, o?: ZipOptions<IterateesOfTupleOfIterables<P>>): IterableIterator<IterateesOfTupleOfIterables<P>>
function zipImpl<P extends Iterable<IteratorOrIterable<unknown>>>(p: P, o?: ZipOptions<Iteratee<P>>): IterableIterator<Array<Iteratee<Iteratee<P>>>>
function zipImpl<P extends { readonly [item: PropertyKey]: IteratorOrIterable<unknown> }>(p: P, o?: ZipOptions<NamedIteratees<P>>): IterableIterator<NamedIteratees<P>>
function* zipImpl(input: unknown, options?: unknown): IterableIterator<Array<unknown> | { [k: PropertyKey]: unknown }> {
  if (!isObject(input)) {
    throw new TypeError;
  }
  if (options == null) {
    options = Object.create(null);
  }
  if (!isObject(options)) {
    throw new TypeError;
  }
  let longest = (options as ZipOptions<never>).longest;
  let strict = (options as ZipOptions<never>).strict;
  if (longest && strict) {
    throw new TypeError;
  }
  let mode: 'shortest' | 'longest' | 'strict' =
    longest ? 'longest' : (strict ? 'strict' : 'shortest');
  if (Symbol.iterator in input) {
    yield* zipPositional(input as Iterable<unknown>, mode, options);
  } else {
    yield* zipNamed(input, mode, options);
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

// TODO: consider whether we want to look up the `.next` properties before we read from the `fillers` option
function* zipCore(iters: Array<Iterator<unknown>>, mode: 'shortest' | 'longest' | 'strict', fillers: Array<unknown>) {
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
        yield results.map((r, i) => r.done ? fillers[i] : r.value);
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

function* zipPositional(input: Iterable<unknown>, mode: 'shortest' | 'longest' | 'strict', options?: unknown): IterableIterator<Array<unknown>> {
  let iters: Array<Iterator<unknown>> = [];
  let fillers: unknown[];
  try {
    for (let iter of input) {
      iters.push(getIteratorFlattenable(iter, 'iterate-strings'));
    }
    fillers = iters.map(() => DEFAULT_FILLER);
    if (mode === 'longest') {
      let tmp = (options as ZipLongestOptions<Iterable<unknown>>).fillers;
      if (tmp != null) {
        fillers = Array.from(tmp);
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
  yield* zipCore(iters, mode, fillers);
}

function* zipNamed(input: Object, mode: 'shortest' | 'longest' | 'strict', options?: unknown): IterableIterator<{ [k: PropertyKey]: unknown }> {
  let keys = getOwnEnumerablePropertyKeys(input);
  let fillers: Array<unknown> = keys.map(() => DEFAULT_FILLER);
  let iters: Array<Iterator<unknown>> = [];
  try {
    for (let k of keys) {
      iters.push(getIteratorFlattenable(input[k], 'iterate-strings'));
    }
    if (mode === 'longest') {
      let tmp = (options as ZipLongestOptions<{ [k: PropertyKey]: unknown }>).fillers;
      if (tmp != null) {
        fillers = keys.map(k => tmp![k]);
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
  for (let result of zipCore(iters, mode, fillers)) {
    yield Object.fromEntries(result.map((r, i) => [keys[i], r]));
  }
}

const zip = (input: any, options: any = undefined) => zipImpl(input, options);

Object.defineProperty(Iterator, 'zip', {
  configurable: true,
  writable: true,
  enumerable: false,
  value: zip,
});