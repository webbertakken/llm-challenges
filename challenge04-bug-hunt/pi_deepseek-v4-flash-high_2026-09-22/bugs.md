# Bug hunt: analysis

Nine functions, seven containing a defect. Each entry states the function, a
one-line description of the defect, the root cause, an input that exposes it,
and the fix. The two functions I concluded are correct are listed at the end
with the reasoning.

---

## 1. `isLeapYear` — the century rule ignores the 400-year exception

- **Description:** A century year such as 2000 is reported as a common year.
- **Root cause:** The predicate is `year % 4 === 0 && year % 100 !== 0`, which
  encodes only half of the proleptic Gregorian rule. The century check was
  written as a blanket exclusion, dropping the "unless divisible by 400"
  escape hatch. Every rule except the 400-year one is present, so the function
  is right for three out of four centuries.
- **Failing input:** `isLeapYear(2000)` → `false`; the contract requires `true`.
  `isLeapYear(2400)` behaves the same way. (`1900` is correctly `false`, which
  is why the defect hides on a casual read.)
- **Fix:** Reintroduce the 400-year exception:
  `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`.

## 2. `chunk` — the slice end index is the chunk size instead of the cursor

- **Description:** Everything after the first chunk is discarded and replaced by
  empty arrays.
- **Root cause:** `arr.slice(i, size)` uses `size` as the absolute end index.
  Only when `i === 0` does the end index happen to be correct; for every later
  chunk `i > size`, so `slice(i, size)` sees an empty or reversed range and
  returns `[]`. The loop still advances, so the output has the right *number* of
  chunks but the wrong *contents*.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` → `[[1,2],[],[]]`; the contract
  requires `[[1,2],[3,4],[5]]`.
- **Fix:** Use a window relative to the cursor: `arr.slice(i, i + size)`.

## 3. `median` — lexicographic sort plus no even-length averaging

- **Description:** Two independent defects: the array is sorted as strings, and
  an even-length input returns the upper-middle element instead of the mean of
  the two middle elements.
- **Root cause:** `nums.slice().sort()` omits the comparator, so JavaScript
  applies `String()` to each element and orders lexicographically (`"10" < "9"`).
  Separately, the body unconditionally returns `sorted[mid]`, so the documented
  even-length branch (mean of the two central values) was never implemented;
  the contract's "even length" sentence is simply absent from the code.
- **Failing inputs:**
  - Lexicographic order: `median([10, 9])` → `9`; numeric order gives
    `(9 + 10) / 2 = 9.5`.
  - Missing averaging: `median([1, 2, 3, 4])` → `3`; the contract requires
    `(2 + 3) / 2 = 2.5`.
- **Fix:** Sort numerically with `(a, b) => a - b`, then branch on parity:
  odd length returns the middle element, even length returns the mean of
  `sorted[mid - 1]` and `sorted[mid]`.

## 4. `roundCurrency` — binary floating point makes half-up round down

- **Description:** Amounts whose third decimal is `5` can round *down* to the
  nearest cent.
- **Root cause:** `Math.round(amount * 100) / 100` relies on `amount * 100`
  producing exactly `x.5` for a half-way value. Most decimal fractions are not
  representable in binary64, so e.g. `1.005 * 100` evaluates to
  `100.49999999999999`, which `Math.round` truncates to `100`. The rounding
  *algorithm* is fine; the *scaled operand* is not the exact decimal it looks
  like.
- **Failing input:** `roundCurrency(1.005)` → `1`; the contract requires `1.01`.
  (Note `roundCurrency(2.675)` happens to return `2.68` because that particular
  product lands just above `267.5` — which is exactly why this defect is subtle
  and must be fixed structurally rather than by nudging one case.)
- **Fix:** The contract guarantees at most three decimals, so first recover the
  exact integer number of thousandths with `Math.round(amount * 1000)`
  (a value within ~1e-9 of an integer, so rounding is unambiguous), then round
  that integer to hundredths: `Math.round(thousandths / 10) / 100`. Dividing an
  integer by 10 keeps a half exactly representable, so `Math.round` now performs
  true half-up.

## 5. `rangeInclusive` — the loop bound excludes the final value

- **Description:** The end value is never produced.
- **Root cause:** `for (let i = start; i < end; i++)` uses a half-open bound,
  contradicting the function's name and contract. With `start === end` the loop
  body never runs at all, so even a single-element range comes back empty.
- **Failing input:** `rangeInclusive(1, 3)` → `[1, 2]`; the contract requires
  `[1, 2, 3]`. `rangeInclusive(5, 5)` → `[]`; the contract requires `[5]`.
- **Fix:** Use the inclusive bound `i <= end`.

## 6. `groupBy` — inherited `Object.prototype` members are mistaken for groups

- **Description:** Keys that name a property of `Object.prototype` (`"toString"`,
  `"constructor"`, `"valueOf"`, …) crash the function instead of forming a
  group.
- **Root cause:** `if (!out[k])` tests truthiness against the prototype chain.
  For `k = "toString"`, `out[k]` resolves to the inherited function, which is
  truthy, so the initialiser is skipped and the code falls through to
  `out[k].push(item)` — calling `.push` on `Function.prototype.toString`. More
  generally, `out` is a normal object literal, so any prototype member shadows
  the intended "does this group exist yet?" test.
- **Failing input:** `groupBy([1], () => "toString")` → throws
  `TypeError: out[k].push is not a function`; the contract requires
  `{ toString: [1] }`.
- **Fix:** Track groups in a `Map` (which has no prototype-key collision and
  preserves insertion order), then materialise the result as own, enumerable
  data properties via `Object.defineProperty`. Using own-property definition
  rather than `out[k] = …` also handles `"__proto__"`, which would otherwise
  hit the inherited prototype setter and never become a real key. The returned
  value stays a plain object with `Object.prototype`, so it compares equal to an
  ordinary object literal.

## 7. `mapLimit` — the callback receives a slice index, not the item index

- **Description:** From the second batch onwards, `fn` is passed an index that
  restarts at 0 in every batch.
- **Root cause:** The inner map callback is `(item, j) => fn(item, j)`, where `j`
  is the position *within the current slice*. The offset of the slice in the
  original array, `i`, is never added. Concurrency, ordering and rejection
  propagation are all correct; only the index argument is wrong, which is why
  the defect is invisible unless the callback actually uses its second
  parameter.
- **Failing input:** `mapLimit([10, 20, 30], 2, (x, i) => Promise.resolve(x + i))`
  → `[10, 21, 30]`; the contract requires `[10, 21, 32]` (the third item is at
  index 2, not 0).
- **Fix:** Pass the absolute index: `fn(item, i + j)`.

---

## Functions I concluded are correct

### `clamp`

`Math.max(lo, Math.min(hi, x))` is a complete, order-independent encoding of the
contract: `Math.min(hi, x)` caps at the top and `Math.max(lo, …)` floors at the
bottom. Given the caller's guarantee `lo <= hi`, every case is covered — `x`
below, inside or above the range, and the boundaries themselves (`Math.max`
returns `lo` when `x <= lo`, `Math.min` returns `hi` when `x >= hi`). There is
no hidden mutation or ordering assumption, so I left it semantically intact.

### `dedupe`

`[...new Set(items)]` removes duplicates using `SameValueZero` and preserves
first-occurrence order, because `Set` iterates in insertion order. It does not
mutate the input. No comparator, no index arithmetic, no prototype access — the
contract is exactly what `Set` provides, so I left it semantically intact.
