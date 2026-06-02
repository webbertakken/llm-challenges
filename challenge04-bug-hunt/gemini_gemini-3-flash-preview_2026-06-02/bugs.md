# Bug Analysis - Challenge 04

## isLeapYear
- **Defect**: Missing the 400-year rule for centuries.
- **Root Cause**: The implementation only checks `year % 4 === 0 && year % 100 !== 0`, which correctly identifies non-century leap years and non-leap centuries, but incorrectly returns `false` for years like 2000 or 1600 that are divisible by 400.
- **Failing Input**: `2000` (returns `false`, should be `true`).
- **Fix**: Add `|| year % 400 === 0`.

## clamp
- **Status**: Correct.
- **Why**: `Math.max(lo, Math.min(hi, x))` correctly ensures `x` is no smaller than `lo` and no larger than `hi`, given `lo <= hi`.

## chunk
- **Defect**: Incorrect `slice` arguments.
- **Root Cause**: `arr.slice(i, size)` uses `size` as the end index for every slice, instead of the relative offset. For the second chunk onwards, `size` will likely be less than or equal to `i`, resulting in empty arrays or incorrect slices.
- **Failing Input**: `chunk([1, 2, 3, 4], 2)` (returns `[[1, 2], []]`, should be `[[1, 2], [3, 4]]`).
- **Fix**: Use `arr.slice(i, i + size)`.

## median
- **Defect**: Lexicographic sort and missing even-length logic.
- **Root Cause**: 
    1. `Array.prototype.sort()` without a comparator sorts elements as strings (e.g., `10` comes before `2`).
    2. The code always returns `sorted[mid]`, which only works for odd lengths. For even lengths, it must return the mean of the two middle elements.
- **Failing Input**: 
    1. `median([10, 2, 5])` (sorts to `[10, 2, 5]` or similar lexicographically, returns `2` or `5` instead of `5`).
    2. `median([1, 2])` (returns `2`, should be `1.5`).
- **Fix**: Use `.sort((a, b) => a - b)` and handle the even-length case by averaging `sorted[mid - 1]` and `sorted[mid]`.

## dedupe
- **Status**: Correct.
- **Why**: `[...new Set(items)]` is the idiomatic way in modern JS to remove duplicates while preserving the order of the first occurrence.

## roundCurrency
- **Defect**: Floating point precision errors with half-up rounding.
- **Root Cause**: `Math.round(amount * 100)` can fail due to binary floating point representation. For example, `1.005 * 100` is `100.49999999999999`, which `Math.round` turns into `100`, resulting in `1.00`, whereas "half up" requires `1.01`.
- **Failing Input**: `1.005` (returns `1`, should be `1.01`).
- **Fix**: Use `Math.round((amount + Number.EPSILON) * 100) / 100` or a more robust rounding method like `Number(Math.round(amount + 'e2') + 'e-2')` (though the contract says at most 3 decimals, so `+ Number.EPSILON` or just `Math.round(amount * 100 + 1e-9) / 100` might suffice). Given the constraint `0 <= amount < 10000` and at most 3 decimals, adding a tiny epsilon before rounding is standard.

## rangeInclusive
- **Defect**: Off-by-one error in loop condition.
- **Root Cause**: The loop uses `i < end`, which excludes the `end` value itself. The contract specifies "inclusive of both ends".
- **Failing Input**: `rangeInclusive(1, 3)` (returns `[1, 2]`, should be `[1, 2, 3]`).
- **Fix**: Change condition to `i <= end`.

## groupBy
- **Defect**: Vulnerable to inherited object properties and `__proto__`.
- **Root Cause**: 
    1. Using a plain object `{}` as a map means keys like `"toString"` or `"hasOwnProperty"` exist on the object's prototype. `if (!out[k])` will be false for these keys even if no items have been grouped under them yet.
    2. If `k` is `"__proto__"`, it could overwrite the object's prototype (though in modern JS `__proto__` as a property name on a literal is special, but as a dynamic key it can be problematic depending on the environment, but more importantly `"toString"` is definitely a problem).
- **Failing Input**: `groupBy(['a'], () => 'toString')` (will try to push to `out.toString.push(...)`, but `out.toString` is the native function, so it will throw or behave incorrectly).
- **Fix**: Use `Object.create(null)` for the object, or better, use `if (!Object.prototype.hasOwnProperty.call(out, k))`.

## mapLimit
- **Defect**: Incorrect batching logic and incorrect indices.
- **Root Cause**:
    1. It processes in discrete batches: it waits for the first `limit` items to finish completely before starting the next `limit`. True `mapLimit` usually maintains a pool of `limit` workers that pick up the next task as soon as one finishes (though some implementations do batching, "at most limit concurrent" usually implies a sliding window). However, the contract doesn't explicitly forbid batching, but it's less efficient.
    2. **CRITICAL BUG**: The index passed to `fn` is `j`, which is the index within the *slice* (`0` to `limit-1`), not the index within the original `items` array.
- **Failing Input**: `mapLimit([10, 20], 1, (v, i) => Promise.resolve(i))` (returns `[0, 0]`, should be `[0, 1]`).
- **Fix**: Pass `i + j` as the index. Use a worker pool if we want to be truly concurrent, but fixing the index is the most immediate defect. Let's implement a proper worker pool for robustness.
