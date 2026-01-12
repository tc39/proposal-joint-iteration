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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi9zcmMvaW5kZXgudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUVBLElBQUksT0FBTyxRQUFRLEtBQUssV0FBVyxJQUFJLFFBQVEsSUFBSSxJQUFJLEVBQUUsQ0FBQztJQUN4RCxVQUFVLENBQUMsUUFBUSxHQUFHLEVBQUUsQ0FBQztBQUMzQixDQUFDO0FBRUQsTUFBTSxjQUFjLEdBQUcsU0FBUyxDQUFDO0FBRWpDLFNBQVMsc0JBQXNCLENBQUMsR0FBUSxFQUFFLGNBQW9EO0lBQzVGLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLEdBQUcsRUFBRSxDQUFDO1FBQ3hCLElBQUksY0FBYyxLQUFLLGdCQUFnQixJQUFJLE9BQU8sR0FBRyxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ25FLE1BQU0sSUFBSSxTQUFTLENBQUMsNENBQTRDLENBQUMsQ0FBQztRQUNwRSxDQUFDO0lBQ0gsQ0FBQztJQUNELElBQUksTUFBTSxHQUFHLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUM7SUFDbEMsSUFBSSxNQUFNLElBQUksSUFBSSxJQUFJLE9BQU8sTUFBTSxLQUFLLFVBQVU7UUFBRSxNQUFNLElBQUksU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDO0lBQ3hGLElBQUksSUFBSSxHQUFHLE1BQU0sSUFBSSxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUNuRCxJQUFJLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7UUFDcEIsTUFBTSxJQUFJLFNBQVMsQ0FBQyx1Q0FBdUMsQ0FBQyxDQUFDO0lBQy9ELENBQUM7SUFDRCxJQUFJLElBQUksR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDO0lBQ3JCLE9BQU8sRUFBRSxJQUFJLEVBQUUsSUFBSSxFQUFFLElBQUksRUFBRSxLQUFLLEVB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