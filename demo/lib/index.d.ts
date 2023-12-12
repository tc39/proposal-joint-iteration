declare var Iterator: {};
declare const DEFAULT_FILLER: undefined;
declare function getIteratorFlattenable(obj: any, stringHandling: 'iterate-strings' | 'reject-strings'): Iterator<unknown>;
declare function isObject(obj: unknown): obj is Object;
declare function getOwnEnumerablePropertyKeys<O extends Object>(obj: O): Array<keyof O>;
interface ZipShortestOptions {
    longest?: false;
    strict?: false;
}
interface ZipLongestOptions<F> {
    longest: true;
    strict?: false;
    fillers?: F;
}
interface ZipStrictOptions {
    longest?: false;
    strict: true;
}
type ZipOptions<F> = ZipShortestOptions | ZipLongestOptions<F> | ZipStrictOptions;
type IteratorOrIterable<A> = Iterable<A> | Iterator<A>;
type Iteratee<A extends IteratorOrIterable<unknown>> = A extends Iterable<infer X> ? X : A extends Iterator<infer X> ? X : never;
type NamedIteratees<P extends {
    readonly [item: PropertyKey]: IteratorOrIterable<unknown>;
}> = {
    -readonly [k in keyof P]: Iteratee<P[k]>;
};
type IterateesOfTupleOfIterables<T extends readonly IteratorOrIterable<unknown>[]> = {
    -readonly [K in keyof T]: Iteratee<T[K]>;
};
declare function zipImpl(p: readonly [], o?: ZipOptions<Iterable<unknown>>): IterableIterator<never>;
declare function zipImpl<P extends readonly IteratorOrIterable<unknown>[] | readonly []>(p: P, o?: ZipOptions<IterateesOfTupleOfIterables<P>>): IterableIterator<IterateesOfTupleOfIterables<P>>;
declare function zipImpl<P extends Iterable<IteratorOrIterable<unknown>>>(p: P, o?: ZipOptions<Iteratee<P>>): IterableIterator<Array<Iteratee<Iteratee<P>>>>;
declare function zipImpl<P extends {
    readonly [item: PropertyKey]: IteratorOrIterable<unknown>;
}>(p: P, o?: ZipOptions<NamedIteratees<P>>): IterableIterator<NamedIteratees<P>>;
type Nexts = Array<{
    done: false;
    next: () => {
        done?: boolean;
        value?: unknown;
    };
} | {
    done: true;
    next?: void;
}>;
declare function getResults(iters: Array<Iterator<unknown>>, nexts: Nexts): Array<{
    done: true;
    value?: undefined;
} | {
    done: false;
    value: unknown;
}>;
declare function zipCore(iters: Array<Iterator<unknown>>, mode: 'shortest' | 'longest' | 'strict', fillers: Array<unknown>): Generator<unknown[], void, unknown>;
declare function zipPositional(input: Iterable<unknown>, mode: 'shortest' | 'longest' | 'strict', options?: unknown): IterableIterator<Array<unknown>>;
declare function zipNamed(input: Object, mode: 'shortest' | 'longest' | 'strict', options?: unknown): IterableIterator<{
    [k: PropertyKey]: unknown;
}>;
declare const zip: (input: any, options?: any) => IterableIterator<never>;