# Bug hunt — analysis

Seven of the nine functions in `toolkit.ts` contain defects; two are already
correct. Each defect is described below with its root cause, a failing input
that exposes it, and the fix. The two correct functions are listed at the end.

## Defects

### 1. `isLeapYear`

- **Defect:** Century years divisible by 400 are wrongly reported as non-leap.
- **Root cause:** The original `year % 4 === 0 && year % 100 !== 0` omits the
  Gregorian exception — a century year IS a leap year when it is divisible by
  400. The `% 100 !== 0` clause rejects every century year, including 2000 and
  1600.
- **Failing input:** `isLeapYear(2000)` returns `false`; it must return `true`.
- **Fix:** `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`.

### 2. `chunk`

- **Defect:** Every chunk after the first is empty.
- **Root cause:** `arr.slice(i, size)` uses `size` as the *end* index instead
  of `i + size`. For `i >= size` the start exceeds the end, so `slice` returns
  `[]`; for `i < size` the chunk is truncated to `size` elements regardless of
  position.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]`
  instead of `[[1, 2], [3, 4], [5]]`.
- **Fix:** `arr.slice(i, i + size)`.

### 3. `median`

- **Defect:** Wrong result for multi-digit numbers (lexicographic ordering) and
  wrong result for even-length input (no averaging).
- **Root cause:** Two defects. (a) `sort()` with no comparator converts
  elements to strings and sorts lexicographically, so `[2, 10]` sorts to
  `[10, 2]`. (b) The even-length branch is missing entirely: it always returns
  the single middle element instead of the mean of the two middle elements.
- **Failing inputs:** `median([2, 10, 1])` returns `10` instead of `2`;
  `median([1, 2, 3, 4])` returns `3` instead of `2.5`.
- **Fix:** `sort((a, b) => a - b)`; for even length return
  `(sorted[mid - 1] + sorted[mid]) / 2`.

### 4. `roundCurrency`

- **Defect:** Half-up rounding fails on values whose binary representation
  falls just below the half.
- **Root cause:** `amount * 100` is computed in binary floating point. `1.005`
  is stored as `1.0049999999999999…`, so `1.005 * 100 === 100.49999999999999`
  and `Math.round` truncates down to `1.00`; likewise `2.675 * 100 ===
  267.4999…` truncates to `2.67`.
- **Failing inputs:** `roundCurrency(1.005)` returns `1` instead of `1.01`;
  `roundCurrency(2.675)` returns `2.67` instead of `2.68`.
- **Fix:** Round on the decimal digits of the string representation (which
  round-trips to the intended value) using integer thousandths, then carry the
  half-up from the third decimal.

### 5. `rangeInclusive`

- **Defect:** The upper bound is never emitted.
- **Root cause:** The loop condition is `i < end` instead of `i <= end`, an
  off-by-one that excludes `end` despite the contract being "inclusive".
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]` instead of
  `[1, 2, 3]`.
- **Fix:** `i <= end`.

### 6. `groupBy`

- **Defect:** Throws (or corrupts the result) for keys that exist on
  `Object.prototype`.
- **Root cause:** The result is a normal `{}`, and `if (!out[k])` tests the
  whole prototype chain. For `k === "toString"` (or `"constructor"`),
  `out[k]` is the inherited function, which is truthy, so the code calls
  `.push` on a function and throws `TypeError`. For `"__proto__"`, assignment
  would clobber the object's prototype instead of creating an own property.
- **Failing inputs:** `groupBy([1], () => "toString")` throws; a `"constructor"`
  key hits the same trap.
- **Fix:** Use `Object.create(null)` for the accumulator, then
  `(out[k] ??= []).push(item)`.

### 7. `mapLimit`

- **Defect:** The index passed to `fn` is the position within the current
  batch, not the position in `items`.
- **Root cause:** `slice.map((item, j) => fn(item, j))` reuses `j` (the
  per-slice index) instead of the global index. For every batch after the
  first, `fn` receives `0, 1, …` again instead of `limit, limit + 1, …`.
- **Failing input:** `await mapLimit(["a", "b", "c"], 2, (_, i) =>
  Promise.resolve(i))` resolves to `[0, 1, 0]` instead of `[0, 1, 2]`.
- **Fix:** pass `i + j` (`fn(item, i + j)`).

## Already-correct functions

### `clamp`

`Math.max(lo, Math.min(hi, x))` is exactly right: `Math.min(hi, x)` caps the
top, `Math.max(lo, …)` lifts the bottom, and with `lo <= hi` the two never
conflict. Left semantically intact.

### `dedupe`

`[...new Set(items)]` removes duplicates while a `Set` preserves insertion
order, giving first-occurrence order. It never mutates the input. Left
semantically intact.
