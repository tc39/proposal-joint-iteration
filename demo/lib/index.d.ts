declare var Iterator: {};
declare const DEFAULT_FILLER: undefined;
declare function getIteratorFlattenable(obj: any, stringHandling: 'iterate-strings' | 'reject-strings'): IteratorRecord;
declare function isObject(obj: unknown): obj is Object;
interface ZipShortestOptions {
    mode?: 'shortest';
}
interface ZipLongestOptions<F> {
    mode: 'longest';
    padding?: F;
}
interface ZipStrictOptions {
    mode: 'strict';
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
type IteratorRecord = {
    iter: Iterator<unknown>;
    next: Iterator<unknown>['next'];
    done: boolean;
};
type Mode = 'shortest' | 'longest' | 'strict';
declare function getMode(options: ZipOptions<any>): Mode;
declare function getPadding(options: ZipLongestOptions<any>): Object | undefined;
declare function IteratorCloseAll(iters: Array<{
    done: boolean;
    iter: {
        return?: () => void;
    };
} | {
    done: true;
}>, error?: {
    error: unknown;
}, skipIndex?: number): void;
declare let IteratorHelperProto: any;
declare function wrapForIteratorHelperBehavior<T, S>(input: IterableIterator<Array<T>>, underlyingIterators: Array<IteratorRecord>, finalize: (vals: Array<T>) => S): IterableIterator<S>;
declare function zip(p: readonly [], o?: ZipOptions<Iterable<unknown>>): IterableIterator<never>;
declare function zip<P extends readonly IteratorOrIterable<unknown>[] | readonly []>(p: P, o?: ZipOptions<IterateesOfTupleOfIterables<P>>): IterableIterator<IterateesOfTupleOfIterables<P>>;
declare function zip<P extends Iterable<IteratorOrIterable<unknown>>>(p: P, o?: ZipOptions<Iteratee<P>>): IterableIterator<Array<Iteratee<Iteratee<P>>>>;
declare function zipKeyed<P extends {
    readonly [item: PropertyKey]: IteratorOrIterable<unknown>;
}>(p: P, o?: ZipOptions<NamedIteratees<P>>): IterableIterator<NamedIteratees<P>>;
declare function zipCore(iters: Array<IteratorRecord | {
    done: true;
}>, mode: 'shortest' | 'longest' | 'strict', padding: Array<unknown>): Generator<unknown[], void, unknown>;
