Joint Iteration
===============

A TC39 proposal to synchronise the advancement of multiple iterators.

**Stage:** 2.7

**Demo:** https://tc39.es/proposal-joint-iteration/demo/

**Specification:** https://tc39.es/proposal-joint-iteration/

## motivation

Often you have 2 or more iterators that are positionally aligned (the first
value yielded by the first iterator corresponds to the first value yielded by
the other iterators, and so on), and you would like to operate on the
corresponding values together. A common solution to this is `zip`, which
produces an iterator of the combined values. `zipWith` allows combination of
values in some way other than tupling. Some languages express `zipWith` as a
variadic `map`.

## presentations to committee

- [June 2024](https://docs.google.com/presentation/d/1Qj5h6MajJnji1obZsXea_cUgfwxur-yT6v-8rBTLqtg)
- [January 2024](https://docs.google.com/presentation/d/150lLig7sNDr173RVzRgNRKrrUBKzKPImrHjGnfrETzQ)
- [November 2023](https://docs.google.com/presentation/d/1sgqXgWBsDF0S43wVuFgIyOC8Y3AMFt1qxBIFbzEq9Vg)
- [September 2023](https://docs.google.com/presentation/d/18Xnd--QmYV8c-qw3tGe4zvlIfF5A-CdXr-qW1tW6j4o)

## proposal

This proposal would add two methods, `Iterator.zip` and `Iterator.zipKeyed`. `zip` takes an iterable of iterables and produces an iterable of arrays where position corresponds to position in the passed iterable, `zipKeyed` takes an object whose value are iterables and produces an iterable of objects where keys correspond to keys in the passed object:

```js
Iterator.zip([
  [0, 1, 2],
  [3, 4, 5],
]).toArray()

/*
Produces:
[
  [0, 3],
  [1, 4],
  [2, 5],
]
*/

```
```js
Iterator.zipKeyed({
  a: [0, 1, 2],
  b: [3, 4, 5, 6],
  c: [7, 8, 9],
}).toArray()

/*
Produces:
[
  { a: 0, b: 3, c: 7 },
  { a: 1, b: 4, c: 8 },
  { a: 2, b: 5, c: 9 },
]
*/
```

Both methods take an options bag as a second argument which allows specifying a `mode` of `"shortest"` (the default), `"longest"`, or `"strict"`.

For `"longest"`, the options bag can also define padding to be used for shorter inputs by providing an iterable or object (for `zip` and `zipKeyed` respectively):

```js
Iterator.zipKeyed({
  a: [0, 1, 2],
  b: [3, 4, 5, 6],
  c: [7, 8, 9],
}, {
  mode: 'longest',
  padding: { c: 10 },
}).toArray()

/*
Produces:
[
  { a: 0,         b: 3, c: 7  },
  { a: 1,         b: 4, c: 8  },
  { a: 2,         b: 5, c: 9  },
  { a: undefined, b: 6, c: 10 },
];
*/
```

## considered design space

1. do we support just 2 iterators or something else? 2+? 1+? 0+? **Decision: 0+.**
    1. if 0 is allowed, is that considered never-ending or already completed? **Decision: Already completed.**
    1. should the iterators be passed positionally (combining to arrays) or named (combining to objects)? **Decision: Both, as seperate APIs.**
    1. do we take the iterators as varargs or as an iterable/object? **Decision: Iterable/object.**
        1. varargs eliminates design space for potentially passing an options bag or a combining function
1. do we support iterators and iterables like `Iterator.from` and `flatMap`? **Decision: Just iterables.**
    1. if so, which string handling do we match? `Iterator.from` iterates strings; `flatMap` rejects strings
1. if an iterator completes, do we still advance the other iterators? **Decision: Depends on the mode.**
    1. do we `return` them? **Decision: Yes, except with mode: longest.**
1. if an iterator fails to advance, do we still advance the other iterators? **Decision: Yes.**
    1. if so, do we return an AggregateError? Only if 2+ failures? **Decision: No, first error swallows any subsequent.**
1. do we want `-With` variants for combining the values in other ways than tupling? **Decision: Not in this proposal.**
    1. what about always requiring the combiner?
1. do we want a `zipLongest`/`zipFilled`/`zipAll`? **Decision: Yes, as an option.**
   1. if so, do we want a filler element or to call a function to provide the filler? **Decision: Per-iterable filler elements.**
   1. what about a variant that matches the length of a privileged iterator (`this`)? **Decision: No.**
1. do we want a `zipEqual`/`zipStrict` that throws if they do not complete after the same number of yields? **Decision: Yes, as an option.**

## prior art

### other languages

| language | shortest                  | longest                 | privileged       | strict                  | -With             | 3+ sources | 1 source | 0 sources  |
| -------- | ------------------------- | ----------------------- | ---------------- | ----------------------- | ----------------- | ---------- | -------- | ---------- |
| C++      | `std::ranges::views::zip` |                         |                  |                         | `::zip_transform` | yes        | yes      |            |
| Clojure  | variadic `map`            |                         |                  |                         | yes               | yes        | yes      |            |
| Elm      |                           |                         |                  |                         | `List.map2`       | yes        | yes      |            |
| Haskell  | `zip`                     |                         |                  |                         | `zipWith`         | yes        |          |            |
| OCaml    | `zip`                     |                         |                  | `combine`               | `map2`            |            | yes      |            |
| Python   | `zip`                     | `itertools.zip_longest` |                  | `zip(..., strict=True)` |                   | yes        | yes      | yes, empty |
| Ruby     |                           |                         | `Enumerable#zip` |                         | `zip`             | yes        | yes      |            |
| Rust     | `Iterator::zip`           |                         |                  |                         |                   |            |          |            |
| Scala    | `zip`                     | `it.zipAll(jt, x, y)`   |                  |                         |                   |            |          |            |
| Swift    | `zip`                     |                         |                  |                         |                   |            |          |            |

### JS libraries

| library                    | shortest   | longest                   | privileged | strict     | -With     | 3+ sources | 1 source | 0 sources  |
|----------------------------|------------|---------------------------|------------|------------|-----------|------------|----------|------------|
| @iterable-iterator/zip     | `zip`      | `zipLongest`              |            |            |           | yes        | yes      |            |
| @softwareventures/iterator | `zipOnce`  |                           |            |            |           |            |          |            |
| extra-iterable             | `zip`      | `zip`                     |            |            | `zip`     | yes        | yes      | yes, empty |
| immutable.js               | `Seq::zip` |                           |            |            | `zipWith` | yes        | yes      |            |
| iter-ops                   | `zip`      |                           |            |            |           | yes        | yes      | yes, empty |
| iter-tools                 | `zip`      | `zipAll`                  |            |            |           | yes        | yes      | yes, empty |
| iterablefu                 | `zip`      | `zipAll`                  |            |            |           | yes        | yes      | yes, empty |
| iterare                    | `zip`      |                           |            |            |           |            |          |            |
| itertools-ts               | `zip`      | `zipFilled`, `zipLongest` |            | `zipEqual` |           | yes        | yes      | yes, empty |
| ixjs                       | `zip`      |                           |            |            |           | yes        | yes      | yes, empty |
| lodash                     |            | `zip`                     |            |            | `zipWith` | yes        | yes      | yes, empty |
| ramda                      | `zip`      |                           |            |            | `zipWith` |            |          |            |
| sequency                   | `zip`      |                           |            |            |           |            |          |            |
| wu                         | `zip`      | `zipLongest`              |            |            | `zipWith` | yes        | yes      |            |
| zipiterators               |            | `zipiterators`            |            |            |           |            |          |            |
