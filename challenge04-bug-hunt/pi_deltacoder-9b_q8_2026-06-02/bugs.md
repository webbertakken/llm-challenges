# Bug Analysis for toolkit.ts

## Defects Found

### 1. isLeapYear
- **Function:** `isLeapYear(year: number): boolean`
- **Root cause:** Missing check for century years divisible by 400 (e.g., 2000)
- **Failing input:** `isLeapYear(2000)` returns `false` (should be `true`)
- **Fix:** Added `|| year % 400 === 0` to handle centuries divisible by 400

### 2. chunk
- **Function:** `chunk<T>(arr: readonly T[], size: number): T[][]`
- **Root cause:** Slice end parameter uses fixed `size` instead of `i + size`
- **Failing input:** `chunk([1,2,3,4,5], 2)` returns `[[1,2],[3,4],[]]` instead of `[[1,2],[3,4],[5]]`
- **Fix:** Changed `arr.slice(i, size)` to `arr.slice(i, i + size)`

### 3. median
- **Function:** `median(nums: readonly number[]): number`
- **Root cause:** Only returns middle element, ignores even-length arrays
- **Failing input:** `median([1, 2, 3, 4])` returns `3` instead of `2.5`
- **Fix:** Added conditional to average two middle values for even-length arrays

### 4. roundCurrency
- **Function:** `roundCurrency(amount: number): number`
- **Root cause:** JavaScript floating-point imprecision causes rounding errors
- **Failing input:** `roundCurrency(1.005)` may return `1.00` instead of `1.01`
- **Fix:** Added `+ 0.5` before `Math.round` to compensate for floating-point errors

### 5. rangeInclusive
- **Function:** `rangeInclusive(start: number, end: number): number[]`
- **Root cause:** Loop condition uses `<` instead of `<=`
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]` instead of `[1, 2, 3]`
- **Fix:** Changed `i < end` to `i <= end`

### 6. mapLimit
- **Function:** `mapLimit<T, R>(items: readonly T[], limit: number, fn: (item: T, index: number) => Promise<R>): Promise<R[]>`
- **Root cause:** Passes slice-relative index `j` instead of global index `i + j`
- **Failing input:** When `fn` uses the index, it receives wrong values (e.g., `fn(item, 0)` for second item)
- **Fix:** Changed `fn(item, j)` to `fn(item, i + j)` to pass correct global index

## Functions That Are Correct

### clamp
- Uses `Math.max(lo, Math.min(hi, x))` which correctly clamps to inclusive range
- No defects found

### dedupe
- `Set` preserves insertion order, correctly removes duplicates while maintaining first-occurrence order
- No defects found

### groupBy
- Correctly handles all string keys including prototype keys like `"toString"` and `"constructor"`
- Uses `if (!out[k]) { out[k] = [] }` pattern which works for any string key
- No defects found
