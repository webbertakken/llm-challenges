# Bug Hunt Analysis

### `isLeapYear`
- **Description**: Fails to correctly identify leap years for centuries divisible by 400.
- **Root Cause**: The condition `year % 4 === 0 && year % 100 !== 0` correctly excludes standard centuries (like 1900) but fails to include centuries divisible by 400, which are leap years according to the Gregorian calendar.
- **Failing Input**: `2000` (Returns `false` instead of `true`).
- **Fix**: Updated condition to `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`.

### `chunk`
- **Description**: Slices incorrect chunks from the array due to a misused `end` index.
- **Root Cause**: The `.slice(start, end)` method takes an exclusive `end` index, not a length. By passing `size` as the second argument, `arr.slice(i, size)` extracts from index `i` up to index `size`. For the second iteration (`i=size`), `arr.slice(size, size)` yields an empty array, and subsequent iterations yield nothing or behave erratically.
- **Failing Input**: `chunk([1, 2, 3, 4], 2)` returns `[[1, 2], []]` instead of `[[1, 2], [3, 4]]`.
- **Fix**: Changed `arr.slice(i, size)` to `arr.slice(i, i + size)`.

### `median`
- **Description**: Sorts numbers alphabetically and calculates median incorrectly for even-length arrays.
- **Root Cause**: The default `.sort()` method converts elements to strings and compares their UTF-16 code units (lexicographical sort), which scrambles numeric arrays. Additionally, the function unconditionally returned the middle-right item for even-length arrays rather than calculating the arithmetic mean of the two middle values.
- **Failing Input**: `median([10, 2, 1])` sorts to `[1, 10, 2]` returning `10` instead of `2`. `median([1, 2, 3, 4])` returns `3` instead of `2.5`.
- **Fix**: Passed a numeric comparator `(a, b) => a - b` to `.sort()`, and added logic to average `sorted[mid - 1]` and `sorted[mid]` if the length is even.

### `roundCurrency`
- **Description**: Incorrectly rounds half-up due to floating-point representation errors.
- **Root Cause**: JavaScript represents numbers using IEEE 754 double-precision floats, which causes precision loss for decimal numbers. Multiplying by 100 before rounding can yield an internal value slightly below the `.5` threshold (e.g., `2.675 * 100` becomes `267.49999999999994`), causing `Math.round` to round down instead of up.
- **Failing Input**: `2.675` (Returns `2.67` instead of `2.68`).
- **Fix**: Used exponential notation shifting to safely sidestep floating-point precision loss: `Number(Math.round(Number(amount + 'e2')) + 'e-2')`.

### `rangeInclusive`
- **Description**: Omits the `end` value from the range.
- **Root Cause**: The loop condition was `i < end`, which terminates the loop exactly before reaching the inclusive upper bound.
- **Failing Input**: `rangeInclusive(1, 3)` returns `[1, 2]` instead of `[1, 2, 3]`.
- **Fix**: Changed loop condition to `i <= end`.

### `groupBy`
- **Description**: Vulnerable to prototype pollution resulting in runtime crashes for keys matching Object properties.
- **Root Cause**: The dictionary was initialized as a standard object literal `{}`. When grouping by a key that exists on `Object.prototype` (e.g., `"toString"` or `"constructor"`), the check `if (!out[k])` evaluates to false (as the function exists). It then tries to call `.push()` on the inherited function, throwing a `TypeError`.
- **Failing Input**: `groupBy(["toString"], k => k)` crashes.
- **Fix**: Initialized the dictionary with a null prototype using `Object.create(null)`.

### `mapLimit`
- **Description**: Passes incorrect indexes to the callback function for items beyond the first chunk.
- **Root Cause**: `slice.map((item, j) => fn(item, j))` passes `j`, which is the relative index within the current `slice`, rather than the absolute index within the original `items` array.
- **Failing Input**: `mapLimit(['a', 'b', 'c'], 2, (x, i) => Promise.resolve(i))` yields `[0, 1, 0]` instead of `[0, 1, 2]`.
- **Fix**: Offset the slice index by the outer loop variable: `fn(item, i + j)`.

---

## Correct Functions

The following functions were already completely correct:

1. **`clamp`**: `Math.max(lo, Math.min(hi, x))` correctly forces `x` to be at most `hi` and at least `lo`. Since the caller guarantees `lo <= hi`, this effectively bounds `x` accurately and efficiently.
2. **`dedupe`**: `[...new Set(items)]` correctly iterates over the array and adds items to a `Set`. Because `Set` natively ignores duplicate primitives/references and explicitly preserves insertion order, converting it back to an array fulfills the contract perfectly without any logic bugs.
