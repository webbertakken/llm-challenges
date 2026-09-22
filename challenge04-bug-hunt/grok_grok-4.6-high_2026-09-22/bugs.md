# Bug hunt — defect analysis

Seven functions deviate from their contracts. `clamp` and `dedupe` already match theirs and were left unchanged.

## Defects

### `isLeapYear`

- **One-line:** Century years divisible by 400 are treated as common years.
- **Root cause:** The implementation is `year % 4 === 0 && year % 100 !== 0`. That drops the Gregorian exception: a year divisible by 400 *is* a leap year. The `% 100 !== 0` clause rejects 1600, 2000, 2400, and year 0 in the proleptic calendar.
- **Failing input:** `isLeapYear(2000)` returns `false`; it must be `true`. (`1900` is correctly `false`.)
- **Fix:** `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`.

### `chunk`

- **One-line:** Every chunk after the first is empty because `slice` is given an end index, not a length.
- **Root cause:** `arr.slice(i, size)` uses `size` as the exclusive end index. For `i = 0` this happens to be right (`slice(0, size)`). On the next iteration `i === size`, so `slice(size, size)` is `[]`, and later iterations are also empty (or truncated).
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]` instead of `[[1, 2], [3, 4], [5]]`.
- **Fix:** `arr.slice(i, i + size)`.

### `median`

- **One-line:** Default string sort plus missing even-length mean.
- **Root cause:** Two independent contract breaks. `Array.prototype.sort()` without a comparator is lexicographic (`"10" < "2"`), so numeric order is wrong whenever a value has a different number of digits. Separately, even-length arrays must return the arithmetic mean of the two central values after numeric sort; the code always returns the single element at `floor(n / 2)`.
- **Failing input:** `median([1, 10, 2])` returns `10` (lexicographic middle) instead of `2`. `median([1, 2, 3, 4])` returns `3` instead of `2.5`.
- **Fix:** Copy, sort with `(a, b) => a - b`, return `sorted[mid]` when `n` is odd and `(sorted[mid - 1] + sorted[mid]) / 2` when even.

### `roundCurrency`

- **One-line:** Binary floating-point makes `amount * 100` land just below `k + 0.5`, so half-up rounds down.
- **Root cause:** IEEE-754 cannot represent tenths/hundredths exactly. `1.005 * 100` evaluates to `100.49999999999999`, and `Math.round` then yields `100` (`1.00`) instead of `101` (`1.01`). The domain is `0 <= amount < 10000` with at most three decimals, so rounding through thousandths first is exact enough to recover half-up.
- **Failing input:** `roundCurrency(1.005)` returns `1` instead of `1.01`.
- **Fix:** `Math.round(Math.round(amount * 1000) / 10) / 100` — snap to thousandths, then half-up into cents.

### `rangeInclusive`

- **One-line:** Exclusive upper bound; `end` is never emitted.
- **Root cause:** The loop is `for (let i = start; i < end; i++)`. Inclusive ranges must stop at `end`, not before it. This is a classic off-by-one against the function name and contract.
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]` instead of `[1, 2, 3]`. `rangeInclusive(5, 5)` returns `[]` instead of `[5]`.
- **Fix:** `i <= end`.

### `groupBy`

- **One-line:** Inherited Object.prototype keys (`toString`, `constructor`, …) look like existing buckets.
- **Root cause:** `out` is a `{}` object, so `out[k]` for `k === "toString"` (or `"constructor"`, `"valueOf"`, `"hasOwnProperty"`, …) reads a truthy function off the prototype. The `if (!out[k])` guard therefore skips creating an array, and `out[k].push(item)` throws (`push` is not a function) or corrupts the prototype.
- **Failing input:** `groupBy(["a"], () => "toString")` throws instead of `{ toString: ["a"] }`.
- **Fix:** Gate bucket creation with `Object.hasOwn(out, k)` so prototype properties are ignored.

### `mapLimit`

- **One-line:** The index passed to `fn` is the index inside the current batch, not the index in `items`.
- **Root cause:** Each window is `items.slice(i, i + limit).map((item, j) => fn(item, j))`. `j` restarts at `0` every batch, so item `items[2]` with `limit === 2` is invoked as `fn(items[2], 0)` instead of `fn(items[2], 2)`. The contract requires `fn(item, index)` with `index` the position in `items`.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, async (item, index) => index)` resolves to `[0, 1, 0]` instead of `[0, 1, 2]`.
- **Fix:** Track the original index. A small worker pool still caps concurrency at `limit` and writes `results[index]`, so order and rejection behaviour stay correct without the batch-index slip.

## Already correct

### `clamp`

`Math.max(lo, Math.min(hi, x))` is the standard inclusive clamp. With the caller guarantee `lo <= hi` it returns `x` when `lo <= x <= hi`, `lo` when `x < lo`, and `hi` when `x > hi`. No off-by-one, no swapped bounds.

### `dedupe`

`[...new Set(items)]` uses SameValueZero equality and insertion order. That is exactly “drop later duplicates, keep first-occurrence order” for primitives and object identity. No lexicographic or index bug here.
