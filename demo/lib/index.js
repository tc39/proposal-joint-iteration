"use strict";
if (typeof Iterator === 'undefined' || Iterator == null) {
    globalThis.Iterator = {};
}
const DEFAULT_FILLER = undefined;
function getIteratorFlattenable(obj, stringHandling) {
    if (Object(obj) !== obj) {
        if (stringHandling === 'reject-strings' || typeof obj !== 'string') {
            throw new TypeError('getIteratorFlattenable called on bad input');
        }
    }
    let method = obj[Symbol.iterator];
    if (method != null && typeof method !== 'function')
        throw new TypeError('bad iterable');
    let iter = method == null ? obj : method.call(obj);
    if (!isObject(iter)) {
        throw new TypeError('object is not iterator or an iterable');
    }
    let next = iter.next;
    return { iter, next, done: false };
}
function isObject(obj) {
    return Object(obj) === obj;
}
;
function getMode(options) {
    let mode = options.mode;
    if (mode === undefined) {
        mode = 'shortest';
    }
    if (mode !== 'shortest' && mode !== 'longest' && mode !== 'strict') {
        throw new TypeError('invalid mode');
    }
    return mode;
}
function getPadding(options) {
    let padding = options.padding;
    if (padding !== undefined && !isObject(padding)) {
        throw new TypeError('padding must be an object');
    }
    return padding;
}
function IteratorCloseAll(iters, error, skipIndex) {
    for (let k = iters.length - 1; k >= 0; --k) {
        if (k === skipIndex)
            continue;
        try {
            let iterK = iters[k];
            if (!iterK.done) {
                iterK.iter.return?.();
            }
        }
        catch (e) {
            if (error)
                continue;
            error = { error: e };
        }
    }
    if (error)
        throw error.error;
}
let IteratorHelperProto = (Iterator.from && Iterator.prototype?.drop) ? Object.getPrototypeOf(Iterator.from([]).drop(0)) : {};
function wrapForIteratorHelperBehavior(input, underlyingIterators, finalize) {
    let state = 'suspended-start';
    return {
        __proto__: IteratorHelperProto,
        [Symbol.iterator]() {
            return this;
        },
        next(v) {
            if (state !== 'suspended-start' && state !== 'suspended-yield')
                return { value: undefined, done: true };
            state = 'suspended-yield';
            let ret = input.next(v);
            if (ret.done)
                return ret;
            return { value: finalize(ret.value), done: false, };
        },
        return(v) {
            if (state === 'suspended-start') {
                state = 'completed';
                IteratorCloseAll(underlyingIterators);
                return { value: v, done: true };
            }
            try {
                input.return(v);
                return { value: v, done: true };
            }
            finally {
                state = 'completed';
            }
        }
    };
}
function zip(input, options = undefined) {
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
        paddingOption = getPadding(options);
    }
    let iters = [];
    let padding = [];
    let inputIterator = input[Symbol.iterator]();
    let inputNext = inputIterator.next;
    try {
        let done, value;
        while (({ done, value } = inputNext.call(inputIterator), !done)) {
            try {
                iters.push(getIteratorFlattenable(value, 'reject-strings'));
            }
            catch (e) {
                iters.unshift({ done: false, iter: inputIterator, next: null });
                throw e;
            }
        }
        if (mode === 'longest') {
            if (paddingOption === undefined) {
                padding = iters.map(() => DEFAULT_FILLER);
            }
            else {
                let paddingIter = paddingOption[Symbol.iterator]();
                let nextFn = paddingIter.next;
                let usingIterator = true;
                for (let i = 0; i < iters.length; ++i) {
                    if (usingIterator) {
                        let next = nextFn.call(paddingIter);
                        if (next.done) {
                            usingIterator = false;
                        }
                        else {
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
    }
    catch (e) {
        IteratorCloseAll(iters, { error: e });
    }
    return wrapForIteratorHelperBehavior(zipCore(iters, mode, padding), iters, x => x);
}
function zipKeyed(input, options = undefined) {
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
        paddingOption = getPadding(options);
    }
    let iters = [];
    let padding = [];
    let allKeys = Reflect.ownKeys(input);
    let keys = [];
    try {
        for (let k of allKeys) {
            let desc = Object.getOwnPropertyDescriptor(input, k);
            if (desc?.enumerable) {
                let value = input[k];
                if (value !== undefined) {
                    keys.push(k);
                    iters.push(getIteratorFlattenable(value, 'reject-strings'));
                }
            }
        }
        if (mode === 'longest') {
            if (paddingOption === undefined) {
                padding = keys.map(() => DEFAULT_FILLER);
            }
            else {
                for (let k of keys) {
                    padding.push(paddingOption[k]);
                }
            }
        }
    }
    catch (e) {
        IteratorCloseAll(iters, { error: e });
    }
    return wrapForIteratorHelperBehavior(zipCore(iters, mode, padding), iters, vs => Object.setPrototypeOf(Object.fromEntries(vs.map((r, i) => [keys[i], r])), null));
}
function* zipCore(iters, mode, padding) {
    if (iters.length === 0)
        return;
    let i = -1;
    let error;
    try {
        while (true) {
            let results = [];
            for (i = 0; i < iters.length; ++i) {
                let iter = iters[i];
                if (iter.done) {
                    console.assert(mode === 'longest');
                    results.push(padding[i]);
                }
                else {
                    let iterResult = iter.next.call(iter.iter);
                    if (iterResult.done) {
                        iter.done = true;
                        if (mode === 'shortest') {
                            return;
                        }
                        else if (mode === 'strict') {
                            if (i !== 0) {
                                throw new TypeError('mode was strict, but iterators were not all same length');
                            }
                            for (i = 1; i < iters.length; ++i) {
                                let toCheck = iters[i];
                                console.assert(!toCheck.done);
                                let { done } = toCheck.next.call(toCheck.iter);
                                if (done) {
                                    toCheck.done = true;
                                }
                                else {
                                    i = -1;
                                    throw new TypeError('mode was strict, but iterators were not all same length');
                                }
                            }
                            return;
                        }
                        else {
                            console.assert(mode === 'longest');
                            if (iters.every(r => r.done))
                                return;
                            iters[i].done = true;
                            results.push(padding[i]);
                        }
                    }
                    else {
                        results.push(iterResult.value);
                    }
                }
            }
            yield results;
        }
    }
    catch (e) {
        error = { error: e };
    }
    finally {
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUVBLElBQUksT0FBTyxRQUFRLEtBQUssV0FBVyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUU7SUFDdkQsVUFBVSxDQUFDLFFBQVEsR0FBRyxFQUFFLENBQUM7Q0FDMUI7QUFFRCxNQUFNLGNBQWMsR0FBRyxTQUFTLENBQUM7QUFFakMsU0FBUyxzQkFBc0IsQ0FBQyxHQUFRLEVBQUUsY0FBb0Q7SUFDNUYsSUFBSSxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssR0FBRyxFQUFFO1FBQ3ZCLElBQUksY0FBYyxLQUFLLGdCQUFnQixJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRTtZQUNsRSxNQUFNLElBQUksU0FBUyxDQUFDLDRDQUE0QyxDQUFDLENBQUM7U0FDbkU7S0FDRjtJQUNELElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVU7UUFBRSxNQUFNLElBQUksU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hGLElBQUksSUFBSSxHQUFHLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFO1FBQ25CLE1BQU0sSUFBSSxTQUFTLENBQUMsdUNBQXVDLENBQUMsQ0FBQztLQUM5RDtJQUNELElBQUksSUFBSSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUM7SUFDckIsT0FBTyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLEtBQUssRUFBRSxDQUFDO0FBQ3JDLENBQUM7QUFFRCxTQUFTLFFBQVEsQ0FBQyxH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