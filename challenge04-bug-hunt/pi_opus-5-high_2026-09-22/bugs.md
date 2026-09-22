# Bug hunt — defect analysis of `toolkit.ts`

Nine functions, seven defective, two correct. Each entry below gives the defect, the root cause
(why the code was wrong, not just which character changed), a concrete input that exposes it, and
the fix that shipped in `fixed.ts`.

---

## 1. `isLeapYear` — the 400-year rule is missing

- **Defect:** century years divisible by 400 are reported as ordinary years.
- **Root cause:** the implementation encodes only two of the three Gregorian rules
  (`divisible by 4`, `except centuries`). The third rule — centuries divisible by 400 *are* leap
  years — was never written, so the predicate is a strict subset of the calendar it claims to
  model. The error only surfaces once every 400 years of input, which is exactly why it survives
  casual testing: 1900, 2100 and 2200 all happen to give the right answer.
- **Failing input:** `isLeapYear(2000)` → `false`, contract says `true`. Same for `1600`, `2400`.
- **Fix:** `year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0)`.

## 2. `chunk` — `slice(i, size)` treats a length as an end index

- **Defect:** every chunk after the first is empty or truncated.
- **Root cause:** `Array.prototype.slice(begin, end)` takes an **end index**, not a count. The code
  passes `size`, the chunk *length*, so the window is `[i, size)` instead of `[i, i + size)`. Once
  `i >= size` the window is empty, and the loop still advances by `size`, so the output has the
  right number of chunks with the wrong contents — the shape looks plausible in a console log.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` → `[[1, 2], [], []]`; contract says
  `[[1, 2], [3, 4], [5]]`. With `size = 1` it is accidentally correct, which hides it further.
- **Fix:** `arr.slice(i, i + size)`.

## 3. `median` — lexicographic sort, and the even case is ignored

Two defects in one function.

- **Defect a — comparator:** `Array.prototype.sort()` with no comparator converts elements to
  strings and orders them by UTF-16 code unit. `[1, 5, 10, 2].sort()` is `[1, 10, 2, 5]`.
  The contract says the ordering is numeric, so the "middle" element is picked out of a
  string-ordered array. It looks correct for single-digit data, which is what most quick tests use.
- **Defect b — parity:** for an even-length input the contract asks for the mean of the two middle
  values; the code always returns `sorted[mid]`, i.e. the upper of the two. The root cause is a
  missing branch, not an off-by-one: `Math.floor(n / 2)` is the correct upper-middle index, but the
  even case needs `(sorted[mid - 1] + sorted[mid]) / 2`.
- **Failing inputs:** `median([1, 5, 10, 2])` → `2` (string order `[1, 10, 2, 5]`, `mid = 2`);
  contract says `3.5`. `median([1, 2])` → `2`; contract says `1.5`.
- **Fix:** sort with `(a, b) => a - b`, then branch on `length % 2`.

## 4. `roundCurrency` — the half-up boundary is destroyed by binary floating point

- **Defect:** amounts whose third decimal is a `5` round **down** instead of up.
- **Root cause:** `amount * 100` is evaluated in binary64. A decimal such as `1.005` is not exactly
  representable; the nearest double is `1.00499999999999989...`, and multiplying by 100 yields
  `100.49999999999999`. `Math.round` then sees a value strictly below the `.5` boundary and rounds
  down. The bug is not in `Math.round` (which is genuinely half-up towards `+∞`); it is that
  scaling by 100 *moves* the value across the tie boundary before the rounding decision is made.
  Note the two examples in the contract behave differently: `2.675 * 100` happens to round to
  exactly `267.5` when the product is itself rounded to a double, so `2.675` works by luck while
  `1.005` fails. Any fix that only special-cases the stated examples is wrong.
- **Failing input:** `roundCurrency(1.005)` → `1`; contract says `1.01`. Also `0.145 → 0.14`
  (expected `0.15`), `0.575 → 0.57` (expected `0.58`). A sweep over every 3-decimal amount in
  `[0, 200)` shows 1147 such mismatches for the original implementation and none for the fix.
- **Fix:** recover the caller's intended decimal first — the contract guarantees at most three
  decimals, so `Math.round(amount * 1000)` is an exact count of thousandths — then do the half-up
  step in integer arithmetic: `Math.floor((thousandths + 5) / 10) / 100`. The only division that
  can introduce representation error is the final `/ 100`, which lands on the nearest double to the
  intended two-decimal value, i.e. the number a caller compares against.

## 5. `rangeInclusive` — exclusive loop for an inclusive contract

- **Defect:** the final value is always missing; a single-element range comes back empty.
- **Root cause:** the loop guard `i < end` is the half-open convention (`[start, end)`), which is
  the right default for most iteration but contradicts this function's documented inclusive range.
  Classic off-by-one from reaching for the familiar idiom rather than the stated contract.
- **Failing input:** `rangeInclusive(1, 3)` → `[1, 2]`; contract says `[1, 2, 3]`.
  `rangeInclusive(5, 5)` → `[]`; contract says `[5]`.
- **Fix:** `i <= end`.

## 6. `groupBy` — inherited prototype properties poison the accumulator

- **Defect:** grouping by a key that collides with an `Object.prototype` member throws, and a
  `"__proto__"` key silently corrupts the result object.
- **Root cause:** the accumulator is an object literal, so it inherits from `Object.prototype`. The
  guard `if (!out[k])` is a *truthiness* test on a property **lookup**, and lookup walks the
  prototype chain: for `k = "toString"` it finds `Function`, which is truthy, so the bucket is
  never created and the next line calls `.push` on `Object.prototype.toString` —
  `TypeError: out[k].push is not a function`. `"constructor"`, `"valueOf"` and `"hasOwnProperty"`
  behave the same way. The related footgun is `"__proto__"`: even with an own-property guard,
  `out["__proto__"] = []` triggers the accessor on `Object.prototype` and re-points the object's
  prototype instead of storing a bucket, so the group disappears from the result.
- **Failing input:** `groupBy(["toString"], (s) => s)` → throws `TypeError`; contract says
  `{ toString: ["toString"] }`. `groupBy(["__proto__"], (s) => s)` with a naive `hasOwn` fix →
  `{}` with a mangled prototype.
- **Fix:** accumulate into a `Map` (no prototype chain, keys are just keys, insertion order
  preserved) and convert once with `Object.fromEntries`, which *defines* own data properties rather
  than assigning them — so `"__proto__"` becomes a genuine entry while the returned value is still
  an ordinary `Object.prototype`-backed plain object, exactly as the signature promises.

## 7. `mapLimit` — the index is batch-relative, and the pool is really a barrier

Two defects in one function.

- **Defect a — index slip:** `slice.map((item, j) => fn(item, j))` passes `j`, the position inside
  the current batch, while the contract says the index is the item's position in `items`. Root
  cause: the outer cursor `i` is dropped when the batch is re-indexed by `Array.prototype.map`.
  Every batch after the first re-uses `0..limit-1`.
- **Defect b — batching instead of a pool:** the function awaits `Promise.all` on a whole slice
  before starting the next one, so a single slow item idles the other workers. Concurrency drops
  below `limit` for the tail of every batch — it never *exceeds* the limit, so a naive
  "max concurrency" assertion passes, but the function does not do what "at most `limit`
  concurrent" is asked to achieve: keep `limit` calls in flight while work remains.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, async (item, i) => i)` → `[0, 1, 0]`; contract
  says `[0, 1, 2]`. For (b): with `limit = 2` and durations `[100ms, 1ms, 1ms, 1ms]` the batched
  version takes ~101 ms + ~1 ms and leaves one worker idle for ~99 ms, where a pool finishes the
  two short tasks during the long one.
- **Fix:** a worker pool — `min(limit, items.length)` async workers pulling from a shared cursor,
  each writing `results[index]` at its absolute index, joined with a single `Promise.all`. The
  single join also means every worker promise has a handler attached, so a rejection propagates
  once instead of surfacing as an unhandled rejection from the still-running siblings.

---

## Functions that are already correct

### `clamp`

`Math.max(lo, Math.min(hi, x))` is the standard nesting and is correct for the guaranteed
`lo <= hi`: the inner `Math.min` caps at `hi`, the outer `Math.max` raises to `lo`, and because the
bounds do not cross, neither step can undo the other. Checked the usual traps: `x` below, inside
and above the range; `lo === hi`; negative and fractional bounds; `-0` inputs (`clamp(-0, 0, 5)`
returns `0`, and `+0`/`-0` compare equal anyway). The only behaviour worth naming is `NaN` in,
`NaN` out, which the contract does not constrain. Left untouched.

### `dedupe`

`[...new Set(items)]` is exactly the contract. `Set` iterates in insertion order, so first
occurrence order is preserved, and it compares with SameValueZero, which is the sane identity for
this job: `NaN` deduplicates against itself (unlike `indexOf`/`includes`-with-`===` approaches,
where `NaN !== NaN`), objects deduplicate by reference, and `+0`/`-0` collapse — all standard
JavaScript value semantics rather than deviations from the contract. It also never mutates the
input. Left untouched.

---

## Verification

```
npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext fixed.ts   # clean
npx tsx grader/grade.ts pi_opus-5-high_2026-09-22                                                   # Score: 9/9 functions correct
```
