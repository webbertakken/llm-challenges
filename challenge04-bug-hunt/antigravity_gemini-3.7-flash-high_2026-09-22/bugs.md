# Bug Hunt: Defect Analysis Report

## Summary of Findings

Out of the 9 functions in `toolkit.ts`:
- **2 functions are correct**: `clamp`, `dedupe`.
- **7 functions contain defects**: `isLeapYear`, `chunk`, `median`, `roundCurrency`, `rangeInclusive`, `groupBy`, `mapLimit`.

---

## Correct Functions

### 1. `clamp(x, lo, hi)`
- **Verdict:** Correct.
- **Reasoning:** `Math.max(lo, Math.min(hi, x))` correctly clamps any numeric `x` to `[lo, hi]` given the precondition `lo <= hi`. If `x < lo`, `Math.min(hi, x)` returns `x` and `Math.max(lo, x)` returns `lo`. If `x > hi`, `Math.min(hi, x)` returns `hi` and `Math.max(lo, hi)` returns `hi`. If `lo <= x <= hi`, both expressions preserve `x`.

### 2. `dedupe(items)`
- **Verdict:** Correct.
- **Reasoning:** `[...new Set(items)]` constructs a standard ES `Set`, which guarantees insertion-order preservation across unique elements. Spreading into an array retains the first occurrence order without mutating the input `items`.

---

## Defective Functions & Root Cause Analysis

### 1. `isLeapYear(year)`
- **Description:** Incorrectly returns `false` for Gregorian leap years on century boundaries divisible by 400.
- **Root Cause:** The logic `year % 4 === 0 && year % 100 !== 0` strictly excludes all century years (`year % 100 === 0`), omitting the Gregorian 400-year exception rule (`year % 400 === 0`).
- **Failing Input:** `isLeapYear(2000)` (returns `false`, expected `true`).
- **Fix:** Update condition to `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`.

### 2. `chunk(arr, size)`
- **Description:** Slices empty chunks after the first slice.
- **Root Cause:** In the loop, `arr.slice(i, size)` passes constant `size` as the end index argument instead of the slice end offset `i + size`. Once `i >= size`, `slice(i, size)` returns `[]`.
- **Failing Input:** `chunk([1, 2, 3, 4], 2)` (returns `[[1, 2], []]`, expected `[[1, 2], [3, 4]]`).
- **Fix:** Change `arr.slice(i, size)` to `arr.slice(i, i + size)`.

### 3. `median(nums)`
- **Description:** Fails to sort numerically and fails to average the two middle values on even-length arrays.
- **Root Cause:**
  1. Default `Array.prototype.sort()` without a comparator converts elements to strings and performs lexicographical comparison (e.g. `[10, 2]` becomes `[10, 2]`).
  2. For even-length arrays, it returns `sorted[mid]` rather than the arithmetic mean `(sorted[mid - 1] + sorted[mid]) / 2`.
- **Failing Input:**
  - `median([10, 2, 5])` (returns `2`, expected `5`).
  - `median([1, 2, 3, 4])` (returns `3`, expected `2.5`).
- **Fix:** Use `nums.slice().sort((a, b) => a - b)` and branch on `sorted.length % 2 === 0` to return `(sorted[mid - 1]! + sorted[mid]!) / 2`.

### 4. `roundCurrency(amount)`
- **Description:** Fails half-up rounding on numbers subject to IEEE-754 binary floating-point representation limits.
- **Root Cause:** `amount * 100` produces floating-point inaccuracies. For example, `1.005 * 100` evaluates to `100.49999999999999`, which `Math.round()` rounds down to `100` (`1.00`), failing the half-up contract (`1.01`).
- **Failing Input:** `roundCurrency(1.005)` (returns `1`, expected `1.01`); `roundCurrency(2.675)` (returns `2.67`, expected `2.68`).
- **Fix:** Scale to integer precision first via `Math.round(Math.round(amount * 1000) / 10) / 100`.

### 5. `rangeInclusive(start, end)`
- **Description:** Excludes the `end` integer value.
- **Root Cause:** The loop termination condition `i < end` creates a half-open interval `[start, end)` rather than an inclusive interval `[start, end]`.
- **Failing Input:** `rangeInclusive(1, 3)` (returns `[1, 2]`, expected `[1, 2, 3]`).
- **Fix:** Change loop condition from `i < end` to `i <= end`.

### 6. `groupBy(items, key)`
- **Description:** Crashes or exhibits corrupted behaviour when grouping by prototype keys such as `"toString"` or `"constructor"`.
- **Root Cause:** The initial accumulator `{}` inherits from `Object.prototype`. Accessing `out["toString"]` evaluates to `Function.prototype.toString` (a truthy function). The check `!out[k]` evaluates to `false`, and `out[k].push(item)` throws a `TypeError: out[k].push is not a function`.
- **Failing Input:** `groupBy(["a"], () => "toString")` (throws `TypeError`).
- **Fix:** Initialize `out` with a null prototype using `Object.create(null)`.

### 7. `mapLimit(items, limit, fn)`
- **Description:** Passes incorrect (chunk-relative) item index to the mapping function `fn`.
- **Root Cause:** `slice.map((item, j) => fn(item, j))` passes `j` (the index within the chunk `0..limit-1`) instead of the global index `i + j` within `items`.
- **Failing Input:** `mapLimit(["a", "b", "c"], 2, async (x, idx) => idx)` (returns `[0, 1, 0]`, expected `[0, 1, 2]`).
- **Fix:** Pass `i + j` to `fn`: `slice.map((item, j) => fn(item, i + j))`.
