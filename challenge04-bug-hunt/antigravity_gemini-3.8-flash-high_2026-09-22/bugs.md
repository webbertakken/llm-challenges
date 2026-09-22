# Challenge 04 — Bug Hunt Analysis

Comprehensive analysis of the functions in `toolkit.ts`.

---

## Correct Functions

Two functions in `toolkit.ts` are completely correct according to their specifications:

### 1. `clamp(x, lo, hi)`
- **Contract:** Clamp `x` into inclusive `[lo, hi]` where `lo <= hi`.
- **Implementation:** `Math.max(lo, Math.min(hi, x))`
- **Reasoning:**
  - If `x < lo`: `Math.min(hi, x) = x`, then `Math.max(lo, x) = lo`.
  - If `lo <= x <= hi`: `Math.min(hi, x) = x`, then `Math.max(lo, x) = x`.
  - If `x > hi`: `Math.min(hi, x) = hi`, then `Math.max(lo, hi) = hi` (since `lo <= hi`).
  All bounds and ordering properties hold across all numerical inputs including negative values, zeroes, and boundary endpoints.

### 2. `dedupe(items)`
- **Contract:** Remove duplicates, preserving first-occurrence order without mutating input.
- **Implementation:** `[...new Set(items)]`
- **Reasoning:**
  - In ECMAScript specifications, `Set` elements are iterated in insertion order.
  - Adding an existing element to a `Set` does not modify its position in the insertion sequence.
  - `Set` utilizes the `SameValueZero` equality algorithm, which correctly treats `+0` and `-0` as equal, and accurately treats multiple `NaN` values as equal (unlike `===`).
  - Spreading into a new array ensures the original array is never mutated.

---

## Defect Analysis

### 1. `isLeapYear(year)`
- **Description:** Fails to recognize century leap years that are multiples of 400.
- **Root Cause:** The expression `year % 4 === 0 && year % 100 !== 0` rejects all century years (multiples of 100). Under the proleptic Gregorian calendar, century years divisible by 400 are leap years.
- **Failing Input:** `year = 2000` (or `1600`, `2400`). Returns `false`, expected `true`.
- **Fix:** Update condition to `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`.

### 2. `chunk(arr, size)`
- **Description:** Slices empty subarrays for all chunks after the first chunk.
- **Root Cause:** `Array.prototype.slice(start, end)` expects the ending index `end`, not the chunk length. The code passed `arr.slice(i, size)` instead of `arr.slice(i, i + size)`. For any `i >= size`, `slice(i, size)` evaluates to `[]`.
- **Failing Input:** `arr = [1, 2, 3, 4]`, `size = 2`. Returns `[[1, 2], []]`, expected `[[1, 2], [3, 4]]`.
- **Fix:** Change `arr.slice(i, size)` to `arr.slice(i, i + size)`.

### 3. `median(nums)`
- **Description:** Sorts items lexicographically and fails to calculate the average of the middle pair for even-length arrays.
- **Root Cause:**
  1. `Array.prototype.sort()` without a comparator converts elements to strings and compares UTF-16 code units (e.g. `[10, 2].sort()` yields `[10, 2]`).
  2. For even lengths, returning `sorted[mid]` selects the upper middle element instead of averaging `sorted[mid - 1]` and `sorted[mid]`.
- **Failing Input:**
  - Lexicographic sort: `[10, 2, 30]`. Returns `2`, expected `10`.
  - Even length: `[1, 3]`. Returns `3`, expected `2`.
- **Fix:** Sort numerically with `(a, b) => a - b`, and return `(sorted[mid - 1] + sorted[mid]) / 2` when `sorted.length % 2 === 0`.

### 4. `roundCurrency(amount)`
- **Description:** Rounds half-way values downwards due to binary floating-point representation limits.
- **Root Cause:** In IEEE 754 double-precision floating point, values such as `1.005 * 100` evaluate to `100.49999999999999` and `2.675 * 100` evaluate to `267.49999999999994`. Applying `Math.round()` rounds these down to `100` (`1.00`) and `267` (`2.67`) instead of half-up to `1.01` and `2.68`.
- **Failing Input:** `amount = 1.005` (returns `1.00`, expected `1.01`) or `amount = 2.675` (returns `2.67`, expected `2.68`).
- **Fix:** Use exponential notation shift before rounding: `Math.round(Number(amount + "e2")) / 100`.

### 5. `rangeInclusive(start, end)`
- **Description:** Excludes the `end` value from the generated range.
- **Root Cause:** The loop uses `<` (`i < end`) instead of `<=`, terminating one iteration before `end`.
- **Failing Input:** `rangeInclusive(1, 3)`. Returns `[1, 2]`, expected `[1, 2, 3]`.
- **Fix:** Change loop condition to `i <= end`.

### 6. `groupBy(items, key)`
- **Description:** Crashes or corrupts object prototype when grouping keys match built-in properties like `"toString"` or `"constructor"`.
- **Root Cause:** An object created with literal `{}` inherits methods from `Object.prototype`. If `key(item)` evaluates to `"toString"`, `out["toString"]` evaluates to `Function.prototype.toString`. The falsy check `!out[k]` is skipped, and calling `out["toString"].push(item)` throws `TypeError: out[k].push is not a function`.
- **Failing Input:** `items = ["hello"]`, `key = () => "toString"`. Throws `TypeError`.
- **Fix:** Initialize `out` with `Object.create(null)` and verify membership with `!Object.prototype.hasOwnProperty.call(out, k)`.

### 7. `mapLimit(items, limit, fn)`
- **Description:** Passes incorrect chunk-relative index instead of the global item index, and implements coarse batching rather than true concurrent pooling.
- **Root Cause:** In `slice.map((item, j) => fn(item, j))`, `j` is the index within the slice (`0 <= j < limit`), not the item's original position in `items`. Additionally, `await Promise.all(slice)` waits for the slowest task in the current batch before starting the next batch rather than running a continuous worker pool.
- **Failing Input:** `items = ['a', 'b', 'c']`, `limit = 2`. The second batch passes `index = 0` for `'c'` instead of `index = 2`.
- **Fix:** Implement a worker pool where each worker picks the next global item index `nextIdx++`, invokes `fn(items[idx], idx)`, and places the result at `results[idx]`.
