# Bug hunt — defects in `toolkit.ts`

Seven functions deviate from their contracts. Two (`clamp`, `dedupe`) already match.

## Defects

### 1. `isLeapYear` — century years divisible by 400 are rejected

- **One-line:** Leap-year test drops the 400-year exception, so years like 2000 are treated as common years.
- **Root cause:** The body is `year % 4 === 0 && year % 100 !== 0`. Proleptic Gregorian also treats a century as a leap year when it is divisible by 400. The second conjunct is false for every multiple of 100, with no recovery path for multiples of 400.
- **Failing input:** `isLeapYear(2000)` returns `false` (should be `true`). `1900` is correctly `false`; `2004` is correctly `true`.
- **Fix:** `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`.

### 2. `chunk` — `slice` end index is `size`, not `i + size`

- **One-line:** Every chunk after the first is empty (or wrong) because `arr.slice(i, size)` uses a fixed end index.
- **Root cause:** `Array.prototype.slice(start, end)` takes an exclusive end index, not a length. The loop already steps `i` by `size`, so the first call `slice(0, size)` happens to work. On the next iteration `i === size`, so `slice(size, size)` is `[]`. Remaining elements are dropped.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]` instead of `[[1, 2], [3, 4], [5]]`.
- **Fix:** `arr.slice(i, i + size)`.

### 3. `median` — lexicographic sort, and even-length mean omitted

- **One-line:** Default `sort()` orders numbers as strings, and even-length arrays return a single middle element instead of the mean of the two central values.
- **Root cause:** `Array.prototype.sort()` with no comparator uses UTF-16 code unit order (`"10" < "2"`). The contract requires numeric order. Independently, `sorted[mid]` with `mid = floor(n/2)` is the upper middle element; for even `n` the contract wants `(sorted[mid-1] + sorted[mid]) / 2`.
- **Failing input:** `median([10, 1, 2])` sorts as `[1, 10, 2]` and returns `10` (should be `2`). `median([1, 3, 2, 4])` should be `2.5`, not `3`.
- **Fix:** Copy, sort with `(a, b) => a - b`, then branch on parity.

### 4. `roundCurrency` — binary floating point breaks half-up

- **One-line:** `Math.round(amount * 100) / 100` undershoots values such as `1.005` because `amount * 100` is not exact in IEEE-754.
- **Root cause:** `1.005` is not representable in binary64. `1.005 * 100` evaluates to `100.49999999999999`, and `Math.round` then yields `100` → `1.00` instead of `1.01`. The same trap hits other 3-decimal inputs whose product with 100 lands just below an `*.5` boundary (`9.995` → `9.99` instead of `10`).
- **Failing input:** `roundCurrency(1.005)` returns `1` (should be `1.01`). `roundCurrency(9.995)` returns `9.99` (should be `10`).
- **Fix:** Scale to integer thousandths (`Math.round(amount * 1000)` is exact on this domain), then half-up on the last digit into cents.

### 5. `rangeInclusive` — exclusive upper bound

- **One-line:** The loop uses `i < end`, so `end` is never emitted.
- **Root cause:** Classic off-by-one. Inclusive range `[start, end]` requires `i <= end` (or an equivalent count of `end - start + 1` iterations). When `start === end` the loop body never runs, so a single-point range becomes `[]`.
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]` instead of `[1, 2, 3]`. `rangeInclusive(5, 5)` returns `[]` instead of `[5]`.
- **Fix:** `for (let i = start; i <= end; i++)`.

### 6. `groupBy` — inherited prototype keys look like existing buckets

- **One-line:** Keys such as `"toString"` and `"constructor"` hit `Object.prototype`, so the code skips creating an array and then fails (or silently mis-groups).
- **Root cause:** `out` is a `{}` with the default prototype. `if (!out[k])` is a truthiness check on a lookup that walks the prototype chain. For `k === "toString"`, `out[k]` is the inherited function (truthy), so no array is allocated and `out[k].push(item)` throws. Same class of failure for `"constructor"`, `"valueOf"`, `"hasOwnProperty"`, etc.
- **Failing input:** `groupBy([{ t: "toString" }], (x) => x.t)` throws `TypeError: out[k].push is not a function`.
- **Fix:** Use a null-prototype object (`Object.create(null)`) and create/push based on `undefined`, not truthiness.

### 7. `mapLimit` — `fn` receives the in-batch index, not the item's index in `items`

- **One-line:** Each batch of `Promise.all` maps with `(item, j)` where `j` restarts at 0, so indices are wrong after the first window.
- **Root cause:** `slice.map((item, j) => fn(item, j))` uses the index inside the slice. For `limit = 2` and a 4-element input, calls 3 and 4 are invoked with `j = 0` and `j = 1` instead of `2` and `3`. The contract says `index` is the item's position in `items`.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, async (item, index) => index)` resolves to `[0, 1, 0]` instead of `[0, 1, 2]`.
- **Fix:** Pass the absolute index (`i + j` in a batch, or a worker-pool cursor). The corrected module uses a pool of `limit` workers so at most `limit` calls run at once, each with the true `index`.

## Already correct

### `clamp`

`Math.max(lo, Math.min(hi, x))` maps `x` onto inclusive `[lo, hi]` given `lo <= hi`. Below `lo` → `lo`, above `hi` → `hi`, inside → `x`. No off-by-one, no mutation, no prototype or ordering issues. Left unchanged.

### `dedupe`

`Set` uses SameValueZero and preserves insertion order, which is first-occurrence order for both primitives and object identity. Spreading into a new array does not mutate the input. Left unchanged.
