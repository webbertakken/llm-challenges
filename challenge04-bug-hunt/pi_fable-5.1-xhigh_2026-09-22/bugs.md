# Bug hunt: findings for `toolkit.ts`

Seven of the nine functions deviate from their contract; `clamp` and `dedupe`
are correct. Each defect below lists the root cause, an input that exposes it,
and the fix shipped in `fixed.ts`.

## Defects

### 1. `isLeapYear` - the 400-year exception is missing

- **Description:** century years divisible by 400 are reported as common years.
- **Root cause:** the rule was implemented as "divisible by 4 and not by 100".
  That is the Julian-to-Gregorian correction with only half of the exception:
  centuries are skipped, but the re-inclusion of every fourth century
  (`% 400 === 0`) was never coded. The function is right for 97 out of every
  100 years, which is why it survives casual testing.
- **Failing input:** `isLeapYear(2000)` returns `false`; expected `true`
  (`1600`, `2400` likewise).
- **Fix:** `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`.

### 2. `chunk` - `slice` is given an absolute end for a relative offset

- **Description:** only the first chunk is populated; every later chunk is
  empty or truncated.
- **Root cause:** `Array.prototype.slice(start, end)` takes an absolute end
  index, but the loop passes `size` as if it were a length:
  `arr.slice(i, size)`. For `i = 0` the two coincide, so the first chunk looks
  right; for `i >= size` the range `[i, size)` is empty.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]`;
  expected `[[1, 2], [3, 4], [5]]`.
- **Fix:** `arr.slice(i, i + size)`.

### 3. `median` - lexicographic sort and no even-length averaging

Two independent defects in one function.

- **Description (a):** numbers are ordered as strings.
- **Root cause (a):** `Array.prototype.sort()` without a comparator converts
  elements to strings and compares UTF-16 code units, so `10` sorts before `9`
  and `-1` sorts before `-10` ... after `0`. Any input mixing digit counts or
  signs gets a wrong middle element.
- **Failing input (a):** `median([10, 9, 2])` returns `2`; expected `9`
  (sorted lexicographically the array is `[10, 2, 9]`).
- **Description (b):** for an even count the upper-middle element is returned
  instead of the mean of the two middle elements.
- **Root cause (b):** `Math.floor(length / 2)` picks index `n/2`, which is the
  upper of the two central positions; the lower one (`n/2 - 1`) is never read
  and no averaging happens.
- **Failing input (b):** `median([1, 2, 3, 4])` returns `3`; expected `2.5`.
- **Fix:** sort with `(a, b) => a - b`; when `length` is even return
  `(sorted[mid - 1] + sorted[mid]) / 2`.

### 4. `roundCurrency` - binary floating point breaks the half-up tie

- **Description:** amounts that end in `5` at the third decimal round down
  instead of up.
- **Root cause:** `1.005` cannot be represented exactly in binary; the stored
  double is `1.00499999999999989...`. Multiplying by 100 gives
  `100.49999999999999`, which `Math.round` correctly rounds to `100`. The tie
  that the contract describes never reaches `Math.round`, because it was lost
  when the literal was parsed. `2.675` behaves the same way
  (`267.49999999999997`).
- **Failing input:** `roundCurrency(1.005)` returns `1`; expected `1.01`.
  `roundCurrency(2.675)` returns `2.67`; expected `2.68`.
- **Fix:** the contract promises at most three decimals and `amount < 10000`,
  so `amount * 1000` is always within a few ulps of an integer number of
  thousandths (an error far below `0.5`). `Math.round(amount * 1000)` recovers
  that exact integer, after which the half-up decision is done on integers:
  `Math.floor((thousandths + 5) / 10) / 100`. Verified exhaustively for every
  three-decimal amount in `[0, 200)` against decimal string arithmetic.

### 5. `rangeInclusive` - exclusive upper bound

- **Description:** `end` is never included.
- **Root cause:** the loop condition is `i < end`, the idiom for a half-open
  range `[start, end)`, while the contract (and the name) promise the closed
  range `[start, end]`. A classic off-by-one; the function also returns `[]`
  for `start === end` where `[start]` is expected.
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]`; expected
  `[1, 2, 3]`. `rangeInclusive(5, 5)` returns `[]`; expected `[5]`.
- **Fix:** `i <= end`.

### 6. `groupBy` - inherited properties are mistaken for buckets

- **Description:** keys that name members of `Object.prototype` throw or
  corrupt the result.
- **Root cause:** the bucket check is `if (!out[k])` on a plain `{}`. Property
  lookup walks the prototype chain, so `out["toString"]` and
  `out["constructor"]` are the inherited functions, which are truthy. The bucket
  is never created and the code calls `.push` on a function, throwing
  `TypeError: out[k].push is not a function`. The key `"__proto__"` is worse:
  even with an own-property check, `out["__proto__"] = []` invokes the
  inherited setter and silently replaces the object's prototype instead of
  storing a bucket.
- **Failing input:** `groupBy(["a"], () => "toString")` throws; expected
  `{ toString: ["a"] }`. `groupBy(["a"], () => "__proto__")` returns `{}` with
  its prototype swapped to an array.
- **Fix:** test with `Object.hasOwn(out, k)` and create each bucket with
  `Object.defineProperty(out, k, { value: [], enumerable: true, writable: true,
  configurable: true })`, which always defines an own data property (also for
  `"__proto__"`). The result stays a plain object with `Object.prototype`, so
  callers that iterate, spread or deep-compare it see exactly the buckets.

### 7. `mapLimit` - index slip, and batches instead of a pool

- **Description:** `fn` receives the position inside the current batch, not
  the position in `items`; additionally, a slow item stalls its whole batch.
- **Root cause:** the loop slices `items` into windows of `limit` and maps the
  slice with `slice.map((item, j) => fn(item, j))`. The `j` is the index
  within the slice, so it restarts at `0` every `limit` items; the offset `i`
  is never added. Batching also means all `limit` calls must finish before any
  of the next `limit` start, so concurrency drops to one while waiting on the
  slowest member of each batch.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, async (_, i) => i)`
  resolves to `[0, 1, 0]`; expected `[0, 1, 2]`.
- **Fix:** a pool of `min(limit, items.length)` workers that pull the next
  index from a shared cursor and write `results[index]`. Every call receives
  its true index, at most `limit` calls are in flight, results land in input
  order, the first rejection rejects the whole promise, and no further items
  are started after a failure.

## Functions that are already correct

- **`clamp`:** `Math.max(lo, Math.min(hi, x))` first caps `x` at `hi`, then
  raises it to at least `lo`. With the guarantee `lo <= hi` the two operations
  cannot fight each other, both bounds are inclusive (`clamp(5, 0, 5)` is `5`),
  and `x` inside the range is returned unchanged. Left untouched.
- **`dedupe`:** `Set` preserves insertion order and, on iteration, yields each
  value once at the position of its first occurrence; spreading it back into an
  array gives exactly "remove duplicates, keep first-occurrence order". Its
  SameValueZero equality even handles `NaN` sensibly. Left untouched.
