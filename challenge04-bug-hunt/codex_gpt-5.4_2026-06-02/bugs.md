# Bug analysis

## Defects found

### `isLeapYear`

- Description: century years divisible by 400 were rejected.
- Root cause: the implementation stopped at `year % 100 !== 0`, so it never applied the Gregorian 400-year exception.
- Failing input: `isLeapYear(2000)` returned `false`.
- Fix: require divisibility by 4 and allow century years only when divisible by 400.

### `chunk`

- Description: chunks after the first were sliced with the wrong end index.
- Root cause: `arr.slice(i, size)` treated `size` as an absolute end offset, not as the chunk length from `i`.
- Failing input: `chunk([1, 2, 3, 4, 5], 2)` returned `[[1, 2], [], []]`.
- Fix: slice with `arr.slice(i, i + size)`.

### `median`

- Description: even-length inputs returned the upper middle element, and sorting was lexicographic instead of numeric.
- Root cause: `Array.prototype.sort()` without a comparator sorts numbers as strings, and the implementation never averaged the two middle values for even lengths.
- Failing input: `median([1, 2, 10])` returned `10`; `median([1, 2, 3, 4])` returned `3`.
- Fix: sort with `(a, b) => a - b` and average the two middle values when the length is even.

### `roundCurrency`

- Description: some half-up cases rounded down because of binary floating-point error.
- Root cause: `Math.round(amount * 100) / 100` relies on an inexact binary representation of decimal fractions like `1.005`.
- Failing input: `roundCurrency(1.005)` returned `1`.
- Fix: convert the guaranteed 3-decimal input into integer thousandths, then round to cents in integer arithmetic.

### `rangeInclusive`

- Description: the end value was omitted.
- Root cause: the loop used `< end` instead of `<= end`.
- Failing input: `rangeInclusive(3, 3)` returned `[]`.
- Fix: iterate while `i <= end`.

### `groupBy`

- Description: inherited object properties broke grouping for keys such as `"toString"` and `"constructor"`.
- Root cause: `{}` inherits from `Object.prototype`, so `out[k]` can already be truthy before any group is created.
- Failing input: `groupBy(["x"], () => "toString")` threw because `out[k]` was the built-in function, not an array.
- Fix: build the result with a null prototype and initialise groups only when the slot is `undefined`.

### `mapLimit`

- Description: `fn` received the index within each batch instead of the index within the original input.
- Root cause: the mapper passed `j` from `slice.map(...)`, which resets to `0` for every chunk.
- Failing input: `await mapLimit(["a", "b", "c"], 2, async (_item, index) => index)` resolved to `[0, 1, 0]`.
- Fix: pass `i + j` so indices match positions in `items`.

## Functions already correct

### `clamp`

- The implementation already enforces the inclusive `[lo, hi]` bound exactly with `Math.max(lo, Math.min(hi, x))`.

### `dedupe`

- `new Set(items)` preserves insertion order for first occurrences, so spreading it back to an array matches the contract without mutating the input.
