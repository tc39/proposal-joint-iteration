declare var Iterator: {};

if (typeof Iterator === 'undefined' || Iterator == null) {
  globalThis.Iterator = {};
}

const DEFAULT_FILLER = void 0;

function getIteratorFlattenable(obj: any, stringHandling: 'iterate-strings' | 'reject-strings'): Iterator<any> {
  if (Object(obj) !== obj) {
    if (stringHandling === 'reject-strings' || typeof obj != 'string') {
      throw new TypeError;
    }
  }
  let iter = Symbol.iterator in obj ? obj[Symbol.iterator]() : obj as Iterator<any>;
  if (Object(iter) !== iter) {
    throw new TypeError;
  }
  return iter;
}

function isObject(obj: unknown): obj is Object {
  return Object(obj) === obj;
}

function getOwnEnumerablePropertKeys<O extends Object>(obj: O): Array<keyof O> {
  let descriptors = Object.getOwnPropertyDescriptors(obj);
  let keys = Reflect.ownKeys(obj) as Array<keyof O>;
  return keys.filter(k => descriptors[k].enumerable);
}

interface ZipShortestOptions {
  longest?: false,
  strict?: false,
}
interface ZipLongestOptions<F> {
  longest?: true,
  strict?: false,
  fillers?: F,
}
interface ZipStrictOptions {
  longest?: false,
  strict?: true,
};
type ZipOptions<F> = ZipShortestOptions | ZipLongestOptions<F> | ZipStrictOptions;

type IteratorOrIterable<A> = Iterable<A> | Iterator<A>
type Iteratee<A extends IteratorOrIterable<unknown>> = A extends Iterable<infer X> ? X : A extends Iterator<infer X> ? X : never
type NamedIteratees<P  extends { readonly [item: PropertyKey]: IteratorOrIterable<unknown> }> = { -readonly [k in keyof P]: Iteratee<P[k]> };
// this layer of indirection is necessary until https://github.com/microsoft/TypeScript/issues/27995 gets fixed
type IterateesOfTupleOfIterables<T extends readonly IteratorOrIterable<unknown>[]> = { -readonly [K in keyof T]: Iteratee<T[K]> }

function zip(p: readonly [], o?: ZipOptions<Iterable<any>>): IterableIterator<never>
function zip<P extends readonly IteratorOrIterable<unknown>[] | readonly []>(p: P, o?: ZipOptions<IterateesOfTupleOfIterables<P>>): IterableIterator<IterateesOfTupleOfIterables<P>>
function zip<P extends Iterable<IteratorOrIterable<unknown>>>(p: P, o?: ZipOptions<Iteratee<P>>): IterableIterator<Array<Iteratee<Iteratee<P>>>>
function zip<P extends { readonly [item: PropertyKey]: IteratorOrIterable<unknown> }>(p: P, o?: ZipOptions<NamedIteratees<P>>): IterableIterator<NamedIteratees<P>>
function* zip(input: unknown, options?: unknown): IterableIterator<Array<unknown> | { [k: PropertyKey]: unknown }> {
  if (!isObject(input)) {
    throw new TypeError;
  }
  if (options == null) {
    options = Object.create(null);
  }
  if (!isObject(options)) {
    throw new TypeError;
  }
  let mode: 'shortest' | 'longest' | 'strict' =
    'longest' in options && options.longest
      ? 'longest'
      : 'strict' in options && options.strict
        ? 'strict'
        : 'shortest';
  if (Symbol.iterator in input) {
    let iters = Array.from(input as Iterable<any>, o => getIteratorFlattenable(o, 'iterate-strings'));
    let nexts = iters.map(i => i.next);
    let fillers: unknown[] = nexts.map(() => DEFAULT_FILLER);
    if (mode === 'longest' && 'fillers' in options) {
        fillers = Array.from(options.fillers as Iterable<unknown>)
    }
    loop: while (true) {
      let results = nexts.map((n, i) => n.call(iters[i]));
      switch (mode) {
        case 'shortest':
          if (results.some(r => r.done)) {
            break loop;
          }
          yield results.map(r => r.value);
          break;
        case 'longest':
          if (results.every(r => r.done)) {
            break loop;
          }
          yield results.map((r, i) => r.done ? fillers[i] : r.value);
          break;
        case 'strict':
          if (results.every(r => r.done)) {
            break loop;
          }
          if (results.some(r => r.done)) {
            throw new Error;
          }
          yield results.map(r => r.value);
          break;
      }
    }
    return;
  }
  let keys = getOwnEnumerablePropertKeys(input);
  let iters = keys.map(k => getIteratorFlattenable(input[k], 'iterate-strings'));
  let nexts = iters.map(i => i.next);
  let fillers: { [k: PropertyKey]: unknown } = {};
  if (mode === 'longest' && 'fillers' in options) {
      fillers = options.fillers as { [k: PropertyKey]: unknown }
  }
  loop: while (true) {
    let results = nexts.map((n, i) => n.call(iters[i]));
    switch (mode) {
      case 'shortest':
        if (results.some(r => r.done)) {
          break loop;
        }
        yield Object.fromEntries(zip([keys, results.map(r => r.value)]));
        break;
      case 'longest':
        if (results.every(r => r.done)) {
          break loop;
        }
        yield Object.fromEntries(results.map((r, i) => [keys[i], r.done ? fillers[keys[i] as string] : r.value]));
        break;
      case 'strict':
        if (results.every(r => r.done)) {
          break loop;
        }
        if (results.some(r => r.done)) {
          throw new Error;
        }
        yield Object.fromEntries(zip([keys, results.map(r => r.value)]));
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