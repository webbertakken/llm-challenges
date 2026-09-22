# Bug hunt: defect analysis of `toolkit.ts`

Nine functions, **seven defective** (eight distinct defects: `median` has two), **two correct**
(`clamp`, `dedupe`). Every defect below was reproduced against the original module and verified fixed in
`fixed.ts`; the public API (names, signatures, return types) is unchanged.

## Summary

| Function | Verdict | Defect |
| --- | --- | --- |
| `isLeapYear` | defective | ignores the divisible-by-400 exception to the century rule |
| `clamp` | **correct** | none |
| `chunk` | defective | `slice(i, size)` uses `size` as an end index instead of a length |
| `median` | defective (x2) | lexicographic sort; even-length input does not average the middle pair |
| `dedupe` | **correct** | none |
| `roundCurrency` | defective | binary floating point makes `amount * 100` land just below the half |
| `rangeInclusive` | defective | loop bound `<` excludes `end` |
| `groupBy` | defective | truthiness check on a plain object sees inherited `Object.prototype` members |
| `mapLimit` | defective | passes the index within the batch instead of the index within `items` |

## Defects

### 1. `isLeapYear`: century years divisible by 400 rejected

- **Description:** `2000` (and `1600`, `2400`, `-400`, `0`) is reported as a common year.
- **Root cause:** the Gregorian rule has three tiers (every 4th year, except every 100th, except every
  400th). The code `year % 4 === 0 && year % 100 !== 0` implements only the first two, so the final
  exception that re-admits every 400th year is missing.
- **Failing input:** `isLeapYear(2000)` returns `false`; expected `true`.
- **Fix:** `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`. (Negative proleptic years work too:
  `-400 % 400` is `-0`, and `-0 === 0`.)

### 2. `chunk`: every chunk after the first is wrong

- **Description:** only the first chunk is right; later ones are empty.
- **Root cause:** `Array.prototype.slice(start, end)` takes an **end index**, not a length.
  `arr.slice(i, size)` asks for `[i, size)`, which is empty (or shorter) as soon as `i >= size`.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]`; expected `[[1, 2], [3, 4], [5]]`.
- **Fix:** `arr.slice(i, i + size)`. (Input is still not mutated: `slice` copies.)

### 3. `median` (a): lexicographic sort

- **Description:** numbers are ordered as strings, so the "middle" value is wrong whenever digit counts
  differ.
- **Root cause:** `Array.prototype.sort()` with no comparator converts elements to strings and compares
  UTF-16 code units: `[10, 9, 1]` sorts to `[1, 10, 9]` because `"10" < "9"`.
- **Failing input:** `median([10, 9, 1])` returns `10`; expected `9`.
- **Fix:** sort with a numeric comparator. I use `a < b ? -1 : a > b ? 1 : 0` rather than `a - b`
  because `Infinity - Infinity` is `NaN`, which would make the comparator inconsistent. The copy is made
  with `toSorted`, so the input is still not mutated (the original's `slice()` also preserved that).

### 4. `median` (b): even length returns the upper middle value

- **Description:** for an even number of values the contract requires the mean of the two middle values,
  but the code always returns `sorted[floor(n / 2)]`, the upper middle.
- **Root cause:** the even-length branch of the contract was never implemented.
- **Failing input:** `median([1, 2, 3, 4])` returns `3`; expected `2.5`.
- **Fix:** for even `n`, return the mean of `sorted[n / 2 - 1]` and `sorted[n / 2]`, computed as
  `lower / 2 + upper / 2`: halving is exact for doubles, so this equals `(lower + upper) / 2` but cannot
  overflow to `Infinity` for values near `Number.MAX_VALUE`.

### 5. `roundCurrency`: half-up fails for amounts like 1.005

- **Description:** some exact halves round down.
- **Root cause:** `1.005` has no exact binary representation; the nearest double is
  `1.00499999999999989...`, so `1.005 * 100` is `100.49999999999999` and `Math.round` gives `100`. Whether a
  given half survives depends on the representation error of that particular amount, so the bug is
  input-dependent (`2.675` happens to work because `2.675 * 100` rounds to exactly `267.5`, while
  `0.285 -> 0.28`, `1.255 -> 1.25` fail too).
- **Failing input:** `roundCurrency(1.005)` returns `1`; expected `1.01`.
- **Fix:** use the contract's guarantee (at most 3 decimals, below 10000). `Math.round(amount * 1000)`
  recovers the exact integer number of thousandths (the representation error is around `1e-13`, far from
  `0.5`), and `Math.floor((thousandths + 5) / 10)` then rounds half up in exact integer arithmetic.
  `cents / 100` yields the double nearest to the two-decimal result. Verified exhaustively for every
  3-decimal amount in `[0, 100)`.

### 6. `rangeInclusive`: `end` is excluded

- **Description:** the range is half-open `[start, end)` instead of closed.
- **Root cause:** off-by-one loop bound: `i < end` stops before `end`; the contract says inclusive of
  both ends.
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]`; expected `[1, 2, 3]`. Also
  `rangeInclusive(5, 5)` returns `[]`; expected `[5]`.
- **Fix:** `i <= end`. The loop also starts at `Math.ceil(start)` so that it yields integers only, as the
  contract states (identical for the integer inputs callers normally pass).

### 7. `groupBy`: prototype keys crash (`toString`, `constructor`, `__proto__`)

- **Description:** grouping under a key that names an inherited `Object.prototype` member throws
  `TypeError: out[k].push is not a function`.
- **Root cause:** `out` is a plain `{}`, so `out["toString"]` reads the **inherited** function
  `Object.prototype.toString`. It is truthy, so the `if (!out[k])` guard skips creating the array and
  `.push` is called on a function. For `"__proto__"` it is worse: the read returns `Object.prototype`, and
  an assignment `out["__proto__"] = []` would invoke the prototype setter rather than create a key.
- **Failing input:** `groupBy(["a"], () => "toString")` throws; expected `{ toString: ["a"] }`. Same for
  `"constructor"`, `"hasOwnProperty"`, `"__proto__"`, ...
- **Fix:** group in a `Map<string, T[]>` (no inherited keys), then copy into a plain object with
  `Object.defineProperty`, which creates a genuine own, enumerable property for every key, including
  `"__proto__"`. The result is still a plain object (prototype `Object.prototype`) and the input is not
  mutated.

### 8. `mapLimit`: `fn` receives the wrong index

- **Description:** from the second batch on, `fn` is called with the index relative to the batch.
- **Root cause:** `slice.map((item, j) => fn(item, j))` forwards `j`, the position inside
  `items.slice(i, i + limit)`, but the contract says the index is the item's position in `items`, which is
  `i + j`.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, async (x, i) => x + i)` resolves to `["a0", "b1", "c0"]`;
  expected `["a0", "b1", "c2"]`.
- **Fix:** rewritten as a worker pool: `min(limit, items.length)` workers share one `items.entries()`
  iterator, so each call receives its true index, results are written to `results[index]` (input order),
  and at most `limit` calls are ever in flight. A rejection (or a synchronous throw from `fn`) rejects the
  returned promise and stops workers from starting new items. A side benefit: a slow item no longer stalls
  a whole batch, so throughput is better while the concurrency cap is unchanged.

## Functions that are already correct

- **`clamp(x, lo, hi)`**: `Math.min(hi, x)` caps from above, then `Math.max(lo, ...)` caps from below.
  Given the guarantee `lo <= hi`, the result is `lo` when `x < lo`, `hi` when `x > hi`, and `x` otherwise,
  including the inclusive endpoints (`clamp(5, 0, 5) === 5`). Left unchanged.
- **`dedupe(items)`**: a `Set` keeps only the first insertion of each value and iterates in insertion
  order, so spreading it preserves first-occurrence order. It compares with SameValueZero, which is the
  sensible notion of "duplicate" (`NaN` duplicates are removed, objects compare by identity) and never
  mutates the input. Left unchanged.
