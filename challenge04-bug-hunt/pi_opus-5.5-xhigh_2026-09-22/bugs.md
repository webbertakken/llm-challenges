# Bug hunt: `toolkit.ts` defect report

Summary: **7 of the 9 functions are defective** (9 distinct defects, because `median` and `mapLimit` each have
two), and **2 are correct** (`clamp`, `dedupe`). `fixed.ts` keeps the public API byte-for-byte (same names,
generic parameters, parameter types and return types) and leaves the two correct functions untouched.

| # | Function | Defect | Exposing input | Original | Contract |
| --- | --- | --- | --- | --- | --- |
| 1 | `isLeapYear` | the "divisible by 400" exception is missing | `isLeapYear(2000)` | `false` | `true` |
| 2 | `chunk` | `slice` end index is absolute, not `i + size` | `chunk([1, 2, 3, 4, 5], 2)` | `[[1, 2], [], []]` | `[[1, 2], [3, 4], [5]]` |
| 3 | `median` | default `sort()` compares numbers as strings | `median([10, 9, 1])` | `10` | `9` |
| 4 | `median` | even length returns the upper middle, not the mean | `median([1, 2, 3, 4])` | `3` | `2.5` |
| 5 | `roundCurrency` | half-up applied to a binary approximation of `amount * 100` | `roundCurrency(1.005)` | `1` | `1.01` |
| 6 | `rangeInclusive` | loop bound is exclusive (`<`) | `rangeInclusive(1, 3)` | `[1, 2]` | `[1, 2, 3]` |
| 7 | `groupBy` | inherited `Object.prototype` members are mistaken for existing groups | `groupBy(["a"], () => "toString")` | throws `TypeError` | `{ toString: ["a"] }` |
| 8 | `mapLimit` | `fn` receives the index inside the batch, not inside `items` | `mapLimit(["a", "b", "c"], 2, async (_, i) => i)` | `[0, 1, 0]` | `[0, 1, 2]` |
| 9 | `mapLimit` | lockstep batches: a free slot waits for the whole batch | one 120 ms call + five 10 ms calls, `limit` 2 | 360 ms | 120 ms (no idle slot) |

---

## 1. `isLeapYear`: the 400-year exception is missing

- **Description:** century years divisible by 400 are reported as common years.
- **Root cause:** the Gregorian rule has three tiers (every 4th year, except centuries, except every 400th year).
  `year % 4 === 0 && year % 100 !== 0` encodes only the first two, so the third tier, which *restores* leap
  status, can never fire.
- **Failing input:** `isLeapYear(2000)` returns `false` (expected `true`). The same goes for `1600`, `2400`,
  and in the proleptic calendar `0` and `-400`. `1900` → `false` is correct by coincidence.
- **Fix:** `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`. Negative years work because
  `-400 % 400` is `-0`, and `-0 === 0`.

## 2. `chunk`: `slice(i, size)` uses an absolute end index

- **Description:** every chunk after the first is empty.
- **Root cause:** `Array.prototype.slice(start, end)` takes an *end index*, not a *length*. `arr.slice(i, size)`
  always ends at index `size`. Once `i >= size` the range is empty, but the loop still pushes it.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]` (expected `[[1, 2], [3, 4], [5]]`).
  Any input with `arr.length > size` is affected. Inputs with at most `size` elements hide the bug.
- **Fix:** `arr.slice(i, i + size)`. `slice` clamps the end, so the last chunk is naturally shorter. The input is
  still never mutated.

## 3. `median`: lexicographic sort

- **Description:** values are ordered as strings, so the "middle" element is wrong for multi-digit numbers.
- **Root cause:** without a comparator, `Array.prototype.sort` converts the elements to strings and compares
  UTF-16 code units: `[10, 9, 1]` sorts to `[1, 10, 9]`. Negative numbers and exponents
  (`"-10" < "-5"`, `"1e21"`) break it too.
- **Failing input:** `median([10, 9, 1])` returns `10` (expected `9`).
- **Fix:** numeric comparator `sort((a, b) => a - b)`, still on a copy (`slice()`), so the input is not mutated.

## 4. `median`: even length is not averaged

- **Description:** for an even number of values it returns the upper of the two middle values.
- **Root cause:** `Math.floor(length / 2)` is the upper-middle index for even lengths, and the function returns
  that element for every length, so the even-length branch of the contract was never implemented.
- **Failing input:** `median([1, 2, 3, 4])` returns `3` (expected `2.5`). With both defects,
  `median([-5, -10])` returns `-5` (expected `-7.5`).
- **Fix:** for even lengths, return the mean of `sorted[mid - 1]` and `sorted[mid]`. The mean is computed as
  `(a + b) / 2`, falling back to `a / 2 + b / 2` only if the sum overflows, so `median([1e308, 1.5e308])` is
  `1.25e308` instead of `Infinity`. Halving is exact in binary, so the result is otherwise identical to the
  naive mean, including for subnormals.

## 5. `roundCurrency`: floating-point representation error

- **Description:** some half-cent amounts round *down*.
- **Root cause:** `1.005` has no exact binary representation. The stored double is
  `1.00499999999999989…`, so `1.005 * 100` evaluates to `100.49999999999999` and `Math.round` correctly
  rounds that value down. The half-up decision is made on a value that has already drifted below the
  `.5` boundary. The drift goes either way (`2.675 * 100` happens to land on exactly `267.5` and
  `8.345 * 100` on `834.5000000000001`), which is why spot checks pass. An exhaustive sweep of the contract
  domain (every amount in `[0, 10000)` with at most 3 decimals) shows that **65,628 of the 1,000,000
  half-cent amounts** round the wrong way, while every non-half-cent amount is fine.
- **Failing input:** `roundCurrency(1.005)` returns `1` (expected `1.01`). Others: `1.015 → 1.01`,
  `1.255 → 1.25`, `2.135 → 2.13`.
- **Fix:** use the contract's bounds to leave binary fractions behind. With at most 3 decimals and
  `amount < 10000`, `amount * 1000` is within about 1e-9 of the intended whole number of thousandths, so
  `Math.round(amount * 1000)` recovers it exactly. Half-up is then pure integer arithmetic,
  `cents = Math.floor((thousandths + 5) / 10)`, and `cents / 100` is a single correctly rounded division that
  yields the same double as the decimal literal (`1.01`). Verified exhaustively over all 10,000,000
  inputs of the domain.

## 6. `rangeInclusive`: exclusive upper bound

- **Description:** the end value is never included.
- **Root cause:** a classic off-by-one. `i < end` is the half-open `[start, end)` idiom, but the contract is the
  closed interval `[start, end]`.
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]` (expected `[1, 2, 3]`). The degenerate
  `rangeInclusive(5, 5)` returns `[]` (expected `[5]`).
- **Fix:** `i <= end`.

## 7. `groupBy`: prototype-key footgun

- **Description:** keys that name an `Object.prototype` member crash the function.
- **Root cause:** `out` is an ordinary `{}`, so `out[k]` also finds *inherited* properties.
  - For `k = "toString"` (or `"constructor"`, `"valueOf"`, `"hasOwnProperty"`, …), `out[k]` is a function. It is
    truthy, so no group is created, and `out[k].push(item)` throws `TypeError: out[k].push is not a function`.
  - `"__proto__"` is worse: `out.__proto__` is `Object.prototype`. Had the group been created with
    `out[k] = []`, that would have called the `__proto__` *setter* and replaced the object's prototype instead
    of adding a key.
  - The truthiness check `!out[k]` confuses "absent" with "inherited".
- **Failing input:** `groupBy(["a", "b"], () => "toString")` throws (expected `{ toString: ["a", "b"] }`). Also
  `groupBy([1, 2, 3], n => n % 2 ? "constructor" : "even")` and `groupBy(["x"], () => "__proto__")`.
- **Fix:** collect groups in a `Map<string, T[]>`, which has no inherited keys and keeps first-seen order. Then
  build the result with `Object.fromEntries`, which *defines* own data properties
  (CreateDataProperty, not `[[Set]]`). Even `"__proto__"` therefore becomes an ordinary key, and the result
  is still a plain object whose prototype is `Object.prototype`, so it is not a null-prototype dictionary.
  Items keep their original order within each group, and the input is not mutated. Keys are passed through
  `String(...)` to keep the property-key coercion semantics of the original for untyped callers.

## 8. `mapLimit`: async index slip

- **Description:** `fn` receives the item's index *within its batch*, not its position in `items`.
- **Root cause:** `slice.map((item, j) => fn(item, j))` forwards the local index of the `slice` window. The
  global position is `i + j`, and the batch offset `i` is dropped.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, async (_, i) => i)` resolves to `[0, 1, 0]` (expected
  `[0, 1, 2]`). Any `items.length > limit` exposes it. Results are still in input order, which makes the bug
  easy to miss.
- **Fix:** pass the true index. The rewrite below gets it from `items.entries()`.

## 9. `mapLimit`: lockstep batches waste the concurrency budget

- **Description:** the function starts `limit` calls, then waits for *all* of them before starting any more.
- **Root cause:** a batch-and-`await Promise.all` loop bounds concurrency but serialises the batches, so one
  slow call idles `limit - 1` slots. "At most `limit` concurrent" is meant as a concurrency pool, not as
  fixed-size rounds.
- **Exposing input:** with `limit = 2`, one 120 ms call followed by five 10 ms calls takes **360 ms**
  (3 batches, each as slow as its slowest member). A pool finishes in **120 ms**: the other slot drains
  the five fast calls while the slow one runs.
- **Fix:** a worker pool. `min(limit, items.length)` workers pull `[index, item]` pairs from one shared
  `items.entries()` iterator, so each worker starts the next item the moment its current call settles.
  Every call receives its real index, and results are written to `results[index]`, which keeps input order.
  Concurrency never exceeds `limit` (verified: the peak equals `limit`). Behaviour on failure:
  - `Promise.all` over the workers rejects with the first error.
  - A `failed` flag stops any *new* call from starting after a rejection.
  - A synchronous throw inside `fn` also becomes a rejection, because the call is awaited inside an async
    worker.
  - An empty `items` resolves to `[]`.

---

## Functions that are already correct

- **`clamp(x, lo, hi)`:** `Math.min(hi, x)` caps from above and `Math.max(lo, …)` lifts from below. Given the
  precondition `lo <= hi`, the result is always in `[lo, hi]`, and values already inside are returned unchanged.
  Both bounds are inclusive because `min` and `max` return an equal bound as is. Left untouched.
- **`dedupe(items)`:** a `Set` keeps the first insertion of each value and iterates in insertion order, so
  spreading it removes duplicates while preserving first-occurrence order. Its equality is `SameValueZero`,
  the standard JS notion of "same value" (`NaN` dedupes with `NaN`, and objects compare by reference). It
  does not mutate the input. Left untouched.

## Verification

- **Type-check:**
  - `npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext fixed.ts` is clean.
  - Also clean with `--noUncheckedIndexedAccess --exactOptionalPropertyTypes`.
- **Behaviour:** a scratch harness ran every exposing input above against both modules:
  - The original fails, and `fixed.ts` passes.
  - The `roundCurrency` sweep covered the whole 10,000,000-value domain.
  - `mapLimit` was probed for peak concurrency, index correctness, ordering, rejection and early stop.
- **Grader:** `npx tsx grader/grade.ts <result-folder>` reports `Score: 9/9 functions correct` (run, not read).
