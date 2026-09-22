# Bug hunt

Seven functions break their contract. `clamp` and `dedupe` do not.

## `isLeapYear`

- **Defect:** Century years are never leap years, including years divisible by 400.
- **Root cause:** The predicate stops at `year % 4 === 0 && year % 100 !== 0`. The Gregorian exception (centuries are leap years when divisible by 400) is missing, so every century is rejected.
- **Failing input:** `isLeapYear(2000)` is `false`; it must be `true`. (`1900` correctly stays `false`, which is why a quick check of non-century years hides the bug.)
- **Fix:** `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`.

## `chunk`

- **Defect:** Every chunk after the first is empty once `size` is smaller than the array.
- **Root cause:** `arr.slice(i, size)` treats `size` as an end index. `slice`’s second argument is the exclusive end, not the length, so after `i` passes `size` the range is empty.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]` instead of `[[1, 2], [3, 4], [5]]`.
- **Fix:** `arr.slice(i, i + size)`.

## `median`

Two contract breaks in one function.

- **Defect:** Values are ordered as strings, not as numbers.
- **Root cause:** `Array.prototype.sort` with no compare function converts elements with `ToString` and sorts lexicographically, so `10` sorts before `2`.
- **Failing input:** `median([1, 10, 2])` returns `10`. Numeric order is `[1, 2, 10]`, so the median is `2`.
- **Fix:** `sort((a, b) => a - b)`.

- **Defect:** An even-length list returns only the upper middle value, not the mean of the two middle values.
- **Root cause:** The function always returns `sorted[mid]` where `mid = floor(length / 2)`. That index is the single middle element only when the length is odd.
- **Failing input:** `median([1, 2, 3, 4])` returns `3`. The two middle values are `2` and `3`, so the median is `2.5`.
- **Fix:** When `length` is even, return `(sorted[mid - 1] + sorted[mid]) / 2`.

## `roundCurrency`

- **Defect:** Half-up rounding to cents is wrong for some three-decimal amounts, including the contract’s own example `1.005 → 1.01`.
- **Root cause:** `Math.round(amount * 100) / 100` assumes `amount * 100` lands on a `.5` boundary when the third decimal is 5. In binary floating point, `1.005 * 100` is `100.49999999999999`, so `Math.round` goes down to `100` and the result is `1`. The same trap hits `1.015` (`1.01` instead of `1.02`) and `9.995` (`9.99` instead of `10`). `2.675 * 100` happens to be exact, so that example passes by accident and does not prove the implementation.
- **Failing input:** `roundCurrency(1.005)` returns `1` instead of `1.01`.
- **Fix:** The domain has at most three decimal places, so round to the nearest thousandth first (`Math.round(amount * 1000)`), then round that integer half-up to cents. Checked across every three-decimal value in `[0, 10000)`.

## `rangeInclusive`

- **Defect:** The end value is never included.
- **Root cause:** The loop condition is `i < end`, which is an exclusive range. The name and the contract both require `start` and `end` inclusive.
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]` instead of `[1, 2, 3]`. `rangeInclusive(5, 5)` returns `[]` instead of `[5]`.
- **Fix:** `i <= end`.

## `groupBy`

- **Defect:** Keys that exist on `Object.prototype` (`"toString"`, `"constructor"`) throw, or fail to start a group.
- **Root cause:** The accumulator is `{}`, so `out[k]` walks the prototype chain. `if (!out[k])` sees the inherited function, treats it as an existing bucket, and then calls `.push` on that function.
- **Failing input:** `groupBy(["a"], () => "toString")` throws `out[k].push is not a function`. The same happens for `"constructor"`.
- **Fix:** Accumulate in a `Map` (keys are never looked up on a prototype) and return `Object.fromEntries`, which defines own data properties and keeps insertion order.

## `mapLimit`

- **Defect:** The index passed to `fn` restarts at 0 on every batch.
- **Root cause:** `slice.map((item, j) => fn(item, j))` uses the index inside the slice. The contract says the index is the item’s position in `items`.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, (item, index) => Promise.resolve(index))` resolves to `[0, 1, 0]` instead of `[0, 1, 2]`.
- **Fix:** Pass `i + offset`, where `i` is the start of the batch. Batching still caps concurrency at `limit`, keeps result order, and rejects when any call rejects.

## Already correct

**`clamp`.** `Math.max(lo, Math.min(hi, x))` is the inclusive clamp when the caller guarantees `lo <= hi`. Values inside the range pass through; values outside snap to the nearer endpoint. Left unchanged.

**`dedupe`.** `new Set` keeps first-seen order and collapses duplicates with SameValueZero (`NaN` matches `NaN`, `0` matches `-0`). Nothing in the contract asks for deep equality or a custom comparator, and the input is not mutated. Left unchanged.
