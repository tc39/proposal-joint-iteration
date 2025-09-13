declare var Iterator: {};

if (typeof Iterator === 'undefined' || Iterator == null) {
  globalThis.Iterator = {};
}

const DEFAULT_FILLER = undefined;

function getIteratorFlattenable(obj: any, stringHandling: 'iterate-strings' | 'reject-strings'): IteratorRecord {
  if (Object(obj) !== obj) {
    if (stringHandling === 'reject-strings' || typeof obj !== 'string') {
      throw new TypeError('getIteratorFlattenable called on bad input');
    }
  }
  let method = obj[Symbol.iterator];
  if (method != null && typeof method !== 'function') throw new TypeError('bad iterable');
  let iter = method == null ? obj : method.call(obj);
  if (!isObject(iter)) {
    throw new TypeError('object is not iterator or an iterable');
  }
  let next = iter.next;
  return { iter, next, done: false };
}

function isObject(obj: unknown): obj is Object {
  return Object(obj) === obj;
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

type IteratorRecord = { iter: Iterator<unknown>, next: Iterator<unknown>['next'], done: boolean }

type Mode = 'shortest' | 'longest' | 'strict';

function getMode(options: ZipOptions<any>): Mode {
  let mode = (options as ZipOptions<never>).mode;
  if (mode === undefined) {
    mode = 'shortest';
  }
  if (mode !== 'shortest' && mode !== 'longest' && mode !== 'strict') {
    throw new TypeError(`invalid mode`);
  }
  return mode as Mode;
}

function getPadding(options: ZipLongestOptions<any>): Object | undefined {
  let padding = options.padding;
  if (padding !== undefined && !isObject(padding)) {
    throw new TypeError('padding must be an object');
  }
  return padding;
}

function IteratorCloseAll(iters: Array<{ done: boolean, iter: { return?: () => void } } | { done: true }>, error?: { error: unknown }, skipIndex?: number) {
  for (let k = iters.length - 1; k >= 0; --k) {
    if (k === skipIndex) continue;
    try {
      let iterK = iters[k];
      if (!iterK!.done) {
        iterK!.iter.return?.();
      }
    } catch (e) {
      if (error) continue;
      error = { error: e };
    }
  }
  if (error) throw error.error;
}

// @ts-expect-error Iterator helper types don't exist yet
let IteratorHelperProto = (Iterator.from && Iterator.prototype?.drop) ? Object.getPrototypeOf(Iterator.from([]).drop(0)) : {};

function wrapForIteratorHelperBehavior<T, S>(input: IterableIterator<Array<T>>, underlyingIterators: Array<IteratorRecord>, finalize: (vals: Array<T>) => S): IterableIterator<S> {
  let state = 'suspended-start';
  return {
    // @ts-expect-error TS does not know about __proto__
    __proto__: IteratorHelperProto,
    [Symbol.iterator]() {
      return this;
    },
    next(v) {
      if (state !== 'suspended-start' && state !== 'suspended-yield') return { value: undefined, done: true };
      state = 'suspended-yield';
      let ret = input.next(v);
      if (ret.done) return ret;
      return { value: finalize(ret.value), done: false,  };
    },
    return(v) {
      if (state === 'suspended-start') {
        // we have to do this manually because generators do not run any code if `.return` is called before `.next`
        state = 'completed';
        IteratorCloseAll(underlyingIterators);
        return { value: v, done: true };
      }
      try {
        input.return!(v);
        return { value: v, done: true };
      } finally {
        state = 'completed';
      }
    }
  };
}

function zip(p: readonly [], o?: ZipOptions<Iterable<unknown>>): IterableIterator<never>
function zip<P extends readonly IteratorOrIterable<unknown>[] | readonly []>(p: P, o?: ZipOptions<IterateesOfTupleOfIterables<P>>): IterableIterator<IterateesOfTupleOfIterables<P>>
function zip<P extends Iterable<IteratorOrIterable<unknown>>>(p: P, o?: ZipOptions<Iteratee<P>>): IterableIterator<Array<Iteratee<Iteratee<P>>>>
function zip(input: unknown, options: unknown = undefined): IterableIterator<Array<unknown> | { [k: PropertyKey]: unknown }> {
  if (new.target) {
    throw new TypeError('not a constructor');
  }
  if (!isObject(input)) {
    throw new TypeError('input must be an object');
  }
  if (options === undefined) {
    options = Object.create(null);
  }
  if (!isObject(options)) {
    throw new TypeError('options must be an object');
  }
  let mode = getMode(options);
  let paddingOption;
  if (mode === 'longest') {
    paddingOption = getPadding(options as ZipLongestOptions<unknown>);
  }
  let iters: Array<IteratorRecord> = [];
  let padding: unknown[] = [];

  let inputIterator = (input as Iterable<unknown>)[Symbol.iterator]();
  let inputNext = inputIterator.next;
  try {
    let done, value;
    while (({ done, value } = inputNext.call(inputIterator), !done)) {
      try {
        iters.push(getIteratorFlattenable(value, 'reject-strings'));
      } catch (e) {
        iters.unshift({ done: false, iter: inputIterator, next: null as any });
        throw e;
      }
    }
    if (mode === 'longest') {
      if (paddingOption === undefined) {
        padding = iters.map(() => DEFAULT_FILLER);
      } else {
        let paddingIter = (paddingOption as Iterable<unknown>)[Symbol.iterator]();
        let nextFn = paddingIter.next;
        let usingIterator = true;
        for (let i = 0; i < iters.length; ++i) {
          if (usingIterator) {
            let next = nextFn.call(paddingIter);
            if (next.done) {
              usingIterator = false;
            } else {
              padding.push(next.value);
            }
          }
          if (!usingIterator) {
            padding.push(undefined);
          }
        }
        if (usingIterator) {
          paddingIter.return?.();
        }
      }
    }
  } catch (e) {
    IteratorCloseAll(iters, { error: e });
  }
  return wrapForIteratorHelperBehavior(zipCore(iters, mode, padding), iters, x => x);
}

function zipKeyed<P extends { readonly [item: PropertyKey]: IteratorOrIterable<unknown> }>(p: P, o?: ZipOptions<NamedIteratees<P>>): IterableIterator<NamedIteratees<P>>
function zipKeyed(input: unknown, options: unknown = undefined): IterableIterator<Array<unknown> | { [k: PropertyKey]: unknown }> {
  if (new.target) {
    throw new TypeError('not a constructor');
  }
  if (!isObject(input)) {
    throw new TypeError('input must be an object');
  }
  if (options === undefined) {
    options = Object.create(null);
  }
  if (!isObject(options)) {
    throw new TypeError('options must be an object');
  }
  let mode = getMode(options);
  let paddingOption;
  if (mode === 'longest') {
    paddingOption = getPadding(options as ZipLongestOptions<unknown>);
  }
  let iters: Array<IteratorRecord> = [];
  let padding: Array<unknown> = [];
  let allKeys = Reflect.ownKeys(input);
  let keys: Array<PropertyKey> = [];
  try {
    for (let k of allKeys) {
      let desc = Object.getOwnPropertyDescriptor(input, k);
      if (desc?.enumerable) {
        let value = (input as Record<PropertyKey, unknown>)[k];
        if (value !== undefined) {
          keys.push(k);
          iters.push(getIteratorFlattenable(value, 'reject-strings'));
        }
      }
    }
    if (mode === 'longest') {
      if (paddingOption === undefined) {
        padding = keys.map(() => DEFAULT_FILLER);
      } else {
        for (let k of keys) {
          padding.push((paddingOption as Record<PropertyKey, unknown>)[k]);
        }
      }
    }
  } catch (e) {
    IteratorCloseAll(iters, { error: e });
  }
  return wrapForIteratorHelperBehavior(zipCore(iters, mode, padding), iters, vs => Object.setPrototypeOf(Object.fromEntries(vs.map((r, i) => [keys[i], r])), null));
}

function* zipCore(iters: Array<IteratorRecord | { done: true }>, mode: 'shortest' | 'longest' | 'strict', padding: Array<unknown>) {
  if (iters.length === 0) return;
  let i = -1;
  let error: { error: unknown } | undefined;
  try {
    while (true) {
      let results = [];
      for (i = 0; i < iters.length; ++i) {
        let iter = iters[i]!;
        if (iter.done) {
          console.assert(mode === 'longest');
          results.push(padding[i]);
        } else {
          let iterResult = iter.next.call(iter.iter);
          if (iterResult.done) {
            iter.done = true;
            if (mode === 'shortest') {
              return;
            } else if (mode === 'strict') {
              if (i !== 0) {
                throw new TypeError('mode was strict, but iterators were not all same length');
              }
              for (i = 1; i < iters.length; ++i) {
                let toCheck = iters[i]!;
                console.assert(!toCheck.done);
                let { done } = (toCheck as IteratorRecord).next.call((toCheck as IteratorRecord).iter);
                if (done) {
                  toCheck.done = true;
                } else {
                  i = -1; // so we still close this iterator
                  throw new TypeError('mode was strict, but iterators were not all same length');
                }
              }
              return;
            } else {
              console.assert(mode === 'longest');
              if (iters.every(r => r.done)) return;
              iters[i]!.done = true;
              results.push(padding[i]);
            }
          } else {
            results.push(iterResult.value);
          }
        }
      }
      yield results;
    }
  } catch (e) {
    error = { error: e };
  } finally {
    IteratorCloseAll(iters, error, i);
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
