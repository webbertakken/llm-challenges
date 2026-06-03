# Bug hunt — analysis

Seven of the nine functions deviate from their contract. Two (`clamp`,
`dedupe`) are already correct. Each defect below lists the function, a one-line
description, the root cause, a failing input, and the fix.

---

## 1. `isLeapYear` — missing the 400-year exception

- **Description:** Centuries divisible by 400 are wrongly reported as non-leap.
- **Root cause:** `year % 4 === 0 && year % 100 !== 0` encodes only "divisible
  by 4 and not a century". The proleptic Gregorian rule has a second exception:
  centuries *are* leap years when divisible by 400. That clause is absent, so
  every `% 400 === 0` century is excluded along with the ordinary centuries.
- **Failing input:** `isLeapYear(2000)` → `false`, but 2000 is a leap year.
  (Also `1600`, `2400`.)
- **Fix:** `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`.

## 2. `chunk` — `slice` end index is `size`, not `i + size`

- **Description:** Only the first chunk is correct; every later chunk is empty.
- **Root cause:** `arr.slice(i, size)` uses a *fixed* end index of `size`. It
  should be `i + size`. Once `i >= size`, `slice(i, size)` has start ≥ end and
  returns `[]`. The author confused `slice(start, end)` with a length argument.
- **Failing input:** `chunk([1,2,3,4,5], 2)` → `[[1,2], [], []]`, expected
  `[[1,2], [3,4], [5]]`.
- **Fix:** `arr.slice(i, i + size)`.

## 3. `median` — lexicographic sort *and* no even-length averaging

Two distinct defects in one function:

- **3a. Default (string) sort.** `nums.slice().sort()` coerces elements to
  strings and sorts lexicographically, so `10` orders before `2`. The contract
  says ordering is numeric.
  - **Failing input:** `median([1, 2, 10])` → `10` (sorts to `[1, 10, 2]`,
    middle is `10`), expected `2`.
- **3b. Even length not averaged.** For even length the code returns
  `sorted[Math.floor(n/2)]` — the *upper* of the two middle values — instead of
  the mean of the two middles.
  - **Failing input:** `median([1, 2, 3, 4])` → `3`, expected `2.5`.
- **Root cause:** `Array.prototype.sort` defaults to string comparison; and the
  index `mid = floor(n/2)` only yields the correct single element for odd `n`.
- **Fix:** sort with `(a, b) => a - b`; for even length return
  `(sorted[mid - 1] + sorted[mid]) / 2`.

## 4. `roundCurrency` — binary floating-point round-half-down

- **Description:** Half-way values round down instead of up.
- **Root cause:** `Math.round(amount * 100) / 100`. Decimal fractions like
  `1.005` and `2.675` are not exactly representable in IEEE-754; they are stored
  as `1.00499999…` and `2.67499999…`. Multiplying by 100 yields `100.4999…` and
  `267.4999…`, so `Math.round` rounds *down*, contradicting the contract's own
  examples (`1.005 → 1.01`, `2.675 → 2.68`).
- **Failing input:** `roundCurrency(1.005)` → `1`, expected `1.01`;
  `roundCurrency(2.675)` → `2.67`, expected `2.68`.
- **Fix:** exploit the contract's guarantee of "at most 3 decimals,
  `0 <= amount < 10000`". `Math.round(amount * 1000)` recovers the *exact*
  integer count of thousandths (the residual error is far below 0.5), then
  round half-up to hundredths with pure integer arithmetic:
  `Math.floor((thousandths + 5) / 10) / 100`. This is independent of magnitude,
  unlike an `EPSILON` nudge which is too small to help for large amounts.

## 5. `rangeInclusive` — exclusive upper bound

- **Description:** The endpoint `end` is omitted.
- **Root cause:** The loop condition `i < end` is the exclusive form; an
  inclusive range needs `i <= end`. Classic off-by-one.
- **Failing input:** `rangeInclusive(1, 3)` → `[1, 2]`, expected `[1, 2, 3]`.
- **Fix:** `for (let i = start; i <= end; i++)`.

## 6. `groupBy` — inherited prototype members mistaken for buckets

- **Description:** Grouping by a key that names an `Object.prototype` member
  (`"toString"`, `"constructor"`, …) throws or corrupts the result.
- **Root cause:** `out = {}` inherits from `Object.prototype`, and the existence
  test `if (!out[k])` reads through the prototype chain. For `k = "toString"`,
  `out["toString"]` is the inherited `toString` *function* — truthy — so the
  bucket is never initialised, and `out["toString"].push(item)` then calls
  `.push` on a function (`undefined`) and throws `TypeError`. The related
  `"__proto__"` key is even worse: `out["__proto__"] = []` would invoke the
  prototype *setter* rather than create a property.
- **Failing input:** `groupBy(["x"], () => "toString")` throws
  `TypeError: out[k].push is not a function`.
- **Fix:** back the accumulator with `Object.create(null)` (no inherited
  members, no `__proto__` setter) and test existence with
  `out[k] === undefined`. All keys, including `"toString"`, `"constructor"` and
  `"__proto__"`, then behave as ordinary own data properties. The return type
  stays `Record<string, T[]>`.

## 7. `mapLimit` — index is per-batch, not per-item

- **Description:** `fn` receives the wrong `index` for every item past the
  first batch.
- **Root cause:** Items are processed in batches of `limit`; within a batch the
  callback is `slice.map((item, j) => fn(item, j))`. `j` is the index *inside
  the slice* (always `0..limit-1`), not the item's position in `items`. The
  batch's starting offset `i` is never added back.
- **Failing input:** `mapLimit([10,20,30,40], 2, (_x, i) => Promise.resolve(i))`
  → `[0, 1, 0, 1]`, expected `[0, 1, 2, 3]`.
- **Fix:** `fn(item, i + j)`. (Result ordering, the ≤`limit` concurrency cap,
  and reject-on-first-rejection were already correct via sequential batches and
  `Promise.all`, so only the index needed changing.)

---

## Functions concluded correct

- **`clamp(x, lo, hi)`** — `Math.max(lo, Math.min(hi, x))` is the canonical
  clamp. With the guaranteed `lo <= hi`: `x < lo → lo`, `lo <= x <= hi → x`,
  `x > hi → hi`. All three branches match the contract; nothing to change.
- **`dedupe(items)`** — `[...new Set(items)]`. A `Set` keeps first-insertion
  order and removes duplicates by SameValueZero equality, which is exactly
  "remove duplicates, preserving first-occurrence order". Correct as written.
