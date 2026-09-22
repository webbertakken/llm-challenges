# Bug hunt: analysis of `toolkit.ts`

Seven of the nine functions violate their contract; `clamp` and `dedupe` are correct and are left
untouched in `fixed.ts`. The public API (names, signatures, return types) is unchanged.

## Defects

### 1. `isLeapYear`: missing the divisible-by-400 exception

- **Description:** century years divisible by 400 are reported as common years.
- **Root cause:** the expression `year % 4 === 0 && year % 100 !== 0` encodes only the first two rules of
  the Gregorian calendar; the third rule ("...unless divisible by 400") is absent, so the `% 100` exclusion
  applies to every century.
- **Failing input:** `isLeapYear(2000)` returns `false` (expected `true`); likewise `1600`, `2400`.
- **Fix:** `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`.

### 2. `chunk`: `slice` called with a length instead of an end index

- **Description:** every chunk after the first is empty.
- **Root cause:** `Array.prototype.slice(start, end)` takes an *end index*, not a count. `arr.slice(i, size)`
  only works for `i = 0`; for `i >= size` the end is before the start, so the slice is `[]`.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]` (expected `[[1, 2], [3, 4], [5]]`).
- **Fix:** `arr.slice(i, i + size)`.

### 3. `median`: lexicographic sort, and the even-length rule is ignored (two defects)

- **Description:** wrong order for multi-digit / negative numbers, and even-length inputs return the upper
  middle element instead of the mean of the two middles.
- **Root cause (a):** `sort()` without a comparator converts elements to strings and compares UTF-16 code
  units, so `10 < 9` and `"-1" > "-2"`-style ordering breaks numeric order.
- **Root cause (b):** the function always returns `sorted[mid]`, which is only the median for odd lengths.
- **Failing inputs:** `median([10, 9, 1])` returns `10` (sorted as `[1, 10, 9]`; expected `9`);
  `median([1, 2, 3, 4])` returns `3` (expected `2.5`).
- **Fix:** `sort((a, b) => a - b)` on the copy (input still not mutated), and for even length return the
  mean of `sorted[mid - 1]` and `sorted[mid]` (halving first only if the sum would overflow to `Infinity`).

### 4. `roundCurrency`: binary floating-point representation error

- **Description:** some half-way values round down instead of up.
- **Root cause:** decimals like `1.005` and `2.675` are not representable in binary; the nearest doubles are
  slightly *below* them (`1.00499999999999989...`). Multiplying by 100 gives `100.49999999999999`, and
  `Math.round` then rounds down. The error is in the representation, not in `Math.round`.
- **Failing inputs:** `roundCurrency(1.005)` returns `1` (expected `1.01`); `roundCurrency(2.675)` returns
  `2.67` (expected `2.68`).
- **Fix:** use the contract's guarantees (`0 <= amount < 10000`, at most 3 decimals): `Math.round(amount * 1000)`
  recovers the exact integer number of thousandths (the representation error is far smaller than 0.5), and
  half-up rounding to cents is then pure integer arithmetic: `Math.floor((thousandths + 5) / 10) / 100`.

### 5. `rangeInclusive`: exclusive upper bound (off-by-one)

- **Description:** `end` is never included.
- **Root cause:** the loop condition `i < end` implements a half-open range `[start, end)`, contradicting the
  inclusive contract.
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]` (expected `[1, 2, 3]`); `rangeInclusive(5, 5)`
  returns `[]` (expected `[5]`).
- **Fix:** `i <= end`.

### 6. `groupBy`: inherited prototype keys treated as existing groups

- **Description:** keys that name `Object.prototype` members crash or corrupt the result.
- **Root cause:** `out` is `{}`, so `out["toString"]` / `out["constructor"]` read *inherited* functions. The
  truthiness check `!out[k]` is therefore false, no array is created, and `out[k].push(item)` calls `push`
  on a function, throwing `TypeError: out[k].push is not a function`. The related `"__proto__"` key is
  worse: assignment `out["__proto__"] = []` invokes the prototype setter instead of creating a property.
- **Failing input:** `groupBy(["toString"], (s) => s)` throws (expected `{ toString: ["toString"] }`);
  `groupBy(["constructor"], (s) => s)` likewise.
- **Fix:** test for an *own* property with `Object.hasOwn(out, k)`, and create new groups with
  `Object.defineProperty` so every key (including `"__proto__"`) becomes an ordinary own, enumerable data
  property. The result stays a plain object (`Object.prototype` is still its prototype).

### 7. `mapLimit`: index passed to `fn` is relative to the batch (plus batch stalls)

- **Description:** `fn` receives the wrong index for every item beyond the first batch.
- **Root cause:** `slice.map((item, j) => fn(item, j))` passes `j`, the position *within the slice*, instead
  of the position within `items` (`i + j`). The contract says the index is the item's position in `items`.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, async (x, i) => i)` resolves `[0, 1, 0]` (expected `[0, 1, 2]`).
- **Fix:** replaced the batch loop with a worker pool of `min(limit, items.length)` workers that claim the
  next unprocessed index and call `fn(items[index], index)`, storing into `results[index]` so output order
  matches input order. This also removes a secondary weakness of batching: a slow call no longer blocks the
  next batch from starting while fewer than `limit` calls are in flight. A rejection rejects the returned
  promise (via `Promise.all`) and stops workers from starting further calls.

## Functions that are already correct

- **`clamp(x, lo, hi)`:** `Math.min(hi, x)` caps from above, `Math.max(lo, ...)` lifts from below; given
  `lo <= hi` the result is always in `[lo, hi]` and equals `x` when `x` is already inside. Boundaries are
  inclusive because `min`/`max` return the bound itself on equality.
- **`dedupe(items)`:** `Set` keeps the first insertion of each value (SameValueZero equality, so `NaN` is
  de-duplicated and `0`/`-0` are equal) and iterates in insertion order, so spreading it preserves
  first-occurrence order. `new Set(items)` only reads the input, so it is not mutated.

## Verification

- `npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext fixed.ts`: clean.
- `npx tsx grader/grade.ts <result-folder>`: `Score: 9/9 functions correct`.
