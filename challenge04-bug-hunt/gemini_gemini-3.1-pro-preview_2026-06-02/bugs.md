# Bugs Analysis

## Defects Fixed

1. **`isLeapYear`**
   - **Description**: Incorrectly handles century years that are divisible by 400.
   - **Root cause**: The modulo logic is incomplete and assumes all century years (`% 100 === 0`) are not leap years, missing the exception for years divisible by 400.
   - **Failing input**: `isLeapYear(2000)` (returns `false` instead of `true`).
   - **Fix**: Added `|| year % 400 === 0` to the return condition.

2. **`chunk`**
   - **Description**: Returns empty chunks or incomplete chunks because `slice` end index is wrong.
   - **Root cause**: `Array.prototype.slice(start, end)` expects the ending index as the second argument, but the code passed `size` (the chunk length) instead of `i + size`.
   - **Failing input**: `chunk([1, 2, 3], 2)` (returns `[[1, 2], []]` instead of `[[1, 2], [3]]`).
   - **Fix**: Changed `arr.slice(i, size)` to `arr.slice(i, i + size)`.

3. **`median`**
   - **Description**: Sorts numbers alphabetically and fails to average the two middle numbers for even-length arrays.
   - **Root cause**: `Array.prototype.sort()` without a comparator sorts lexicographically (converting numbers to strings). Additionally, the function unconditionally returns the middle element instead of averaging the two middle elements when the array length is even.
   - **Failing input**: `median([10, 2])` (returns `10` instead of `6`), or `median([1, 2, 3, 4])` (returns `3` instead of `2.5`).
   - **Fix**: Passed a numeric comparator `(a, b) => a - b` to `sort()`, and added an `if (sorted.length % 2 === 0)` block to average the two middle values.

4. **`roundCurrency`**
   - **Description**: Rounds down for certain half-way floating point values like 1.005.
   - **Root cause**: Standard floating-point precision issues cause `1.005 * 100` to evaluate to `100.49999999999999`, which `Math.round` then incorrectly rounds down to `100` instead of `101`.
   - **Failing input**: `roundCurrency(1.005)` (returns `1` instead of `1.01`).
   - **Fix**: Added `Number.EPSILON` before multiplying by 100 to correct the floating-point error margin: `Math.round((amount + Number.EPSILON) * 100) / 100`.

5. **`rangeInclusive`**
   - **Description**: Excludes the ending number from the returned array.
   - **Root cause**: The `for` loop condition uses `< end` instead of `<= end`, making the range exclusive of the final value.
   - **Failing input**: `rangeInclusive(1, 3)` (returns `[1, 2]` instead of `[1, 2, 3]`).
   - **Fix**: Changed the loop condition from `i < end` to `i <= end`.

6. **`groupBy`**
   - **Description**: Throws an error when grouping by a key that exists on `Object.prototype`.
   - **Root cause**: The output object is created as a plain `{}` object, which inherits from `Object.prototype`. If a key evaluates to `"toString"`, `!out[k]` evaluates to `false` (because `Object.prototype.toString` is truthy), and the subsequent `out[k].push(item)` throws a `TypeError` since it's a function, not an array.
   - **Failing input**: `groupBy([{ k: "toString" }], x => x.k)`
   - **Fix**: Initialized the output object with a null prototype using `Object.create(null)`.

7. **`mapLimit`**
   - **Description**: Passes the local slice index instead of the global array index to the mapping function.
   - **Root cause**: The `map` callback receives `j`, the index of the item within the current `limit`-sized slice, rather than its true index in the original `items` array.
   - **Failing input**: `mapLimit([1, 2, 3], 2, (item, idx) => Promise.resolve(idx))` (returns `[0, 1, 0]` instead of `[0, 1, 2]`).
   - **Fix**: Changed the index passed to `fn` from `j` to `i + j`.

## Correct Functions

- **`clamp`**: Already correct. `Math.max(lo, Math.min(hi, x))` correctly handles bounding `x` between `lo` and `hi`, correctly managing boundaries even if `lo === hi`. It inherently aligns with the mathematical definition of clamping.
- **`dedupe`**: Already correct. `[...new Set(items)]` cleanly handles uniqueness and relies on the fact that JavaScript `Set` structures naturally preserve insertion (first-occurrence) order, perfectly matching the required contract.