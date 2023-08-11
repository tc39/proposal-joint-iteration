Joint Iteration
===============

A TC39 proposal to synchronise the advancement of multiple iterators.

**Stage:** 0

## motivation

Often you have 2 or more iterators that are positionally aligned. The first
value yielded by the first iterator corresponds to the first value yielded by
the other iterators, and so on. A common solution to this is `zip`, which
produces an iterator of the combined values. A variadic `map` is another common
solution.

## design space

1. do we support just 2 iterators or something else? 2+? 1+? 0+?
    1. if 0 is allowed, is that considered never-ending or already completed?
    1. should the iterators be passed positionally (combining to arrays) or named (combining to objects)?
    1. do we take the iterators as varargs or as an iterable/object?
        1. varargs eliminates design space for potentially passing an options bag or a combining function
1. do we support iterators and iterables like `Iterator.from` and `flatMap`?
    1. if so, which string handling do we match?
1. if an iterator completes, do we still advance the other iterators?
1. if an iterator fails to advance, do we still advance the other iterators?
    1. if so, do we return an AggregateError? Only if 2+ failures?
1. do we want `-With` variants for combining the values in other ways than tupling?
    1. what about always requiring the combiner?
1. do we want a `zipLongest`/`zipFilled`/`zipAll`?
   1. if so, do we want a filler element or to call a function to provide the filler?
   1. what about a variant that matches the length of a privileged iterator (`this`)?
1. do we want a `zipEqual`/`zipStrict` that throws if they do not complete after the same number of yields?

## prior art

### other languages

| language | shortest        | longest                 | privileged       | strict                  | -With       | 3+ sources | 1 source | 0 sources  |
|----------|-----------------|-------------------------|------------------|-------------------------|-------------|------------|----------|------------|
| Clojure  | variadic `map`  |                         |                  |                         | yes         | yes        | yes      |            |
| Elm      |                 |                         |                  |                         | `List.map2` | yes        | yes      |            |
| Haskell  | `zip`           |                         |                  |                         | `zipWith`   | yes        |          |            |
| OCaml    | `zip`           |                         |                  |                         | `map2`      |            | yes      |            |
| Python   | `zip`           | `itertools.zip_longest` |                  | `zip(..., strict=True)` |             | yes        | yes      | yes, empty |
| Ruby     |                 |                         | `Enumerable#zip` |                         | `zip`       | yes        | yes      |            |
| Rust     | `Iterator::zip` |                         |                  |                         |             |            |          |            |
| Scala    |                 | `it.zipAll(jt, x, y)`   |                  |                         |             |            |          |            |
| Swift    | `zip`           |                         |                  |                         |             |            |          |            |

### JS libraries

| library                    | shortest   | longest                   | privileged | strict     | -With     | 3+ sources | 1 source | 0 sources  |
|----------------------------|------------|---------------------------|------------|------------|-----------|------------|----------|------------|
| @iterable-iterator/zip     | `zip`      | `zipLongest`              |            |            |           | yes        | yes      |            |
| @softwareventures/iterator | `zipOnce`  |                           |            |            |           |            |          |            |
| extra-iterable             | `zip`      | `zip`                     |            |            | `zip`     | yes        | yes      | yes, empty |
| immutable.js               | `Seq::zip` |                           |            |            | `zipWith` | yes        | yes      |            |
| iterablefu                 | `zip`      | `zipAll`                  |            |            |           | yes        | yes      | yes, empty |
| itertools-ts               | `zip`      | `zipFilled`, `zipLongest` |            | `zipEqual` |           | yes        | yes      | yes, empty |
| lodash                     |            | `zip`                     |            |            | `zipWith` | yes        | yes      | yes, empty |
| ramda                      | `zip`      |                           |            |            | `zipWith` |            |          |            |
| wu                         | `zip`      | `zipLongest`              |            |            | `zipWith` | yes        | yes      |            |
| zipiterators               |            | `zipiterators`            |            |            |           |            |          |            |
