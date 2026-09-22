# Bug hunt

Seven functions deviate from their contracts. `clamp` and `dedupe` do not. `median` has two independent defects; every other broken function has one.

## Defects

### `isLeapYear`

- **What:** Years divisible by 400 are reported as common years.
- **Root cause:** The predicate stops at "divisible by 4, but not by 100". The Gregorian rule has a second exception: a century year is a leap year when it is also divisible by 400. `2000 % 100 !== 0` is false, so the `&&` short-circuits to false.
- **Failing input:** `isLeapYear(2000)` returns `false`. It must return `true`. (`1900` is correctly `false`; `2024` is correctly `true`.)
- **Fix:** `(year % 4 === 0 && year % 100 !== 0) || year % 400 === 0`.

### `chunk`

- **What:** Every chunk after the first is empty once the array is longer than `size`.
- **Root cause:** `Array.prototype.slice` takes an end index, not a length. `arr.slice(i, size)` uses `size` as the end. For `i === 0` that happens to be right; for `i > 0` the end is behind the start, so `slice` returns `[]`.
- **Failing input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]`. It must return `[[1, 2], [3, 4], [5]]`.
- **Fix:** `arr.slice(i, i + size)`. The input array is still not mutated.

### `median` — lexicographic sort

- **What:** Values are ordered as strings, not as numbers.
- **Root cause:** `Array.prototype.sort` with no compare function converts elements with `ToString` and compares UTF-16 code units. `"10"` sorts before `"2"`.
- **Failing input:** `median([10, 2, 1])` sorts as `[1, 10, 2]` and returns `10`. The numeric median is `2`.
- **Fix:** `sort((a, b) => a - b)` on a shallow copy, so the input is still not mutated.

### `median` — even length

- **What:** An even-length list returns one of the two middle values instead of their mean.
- **Root cause:** `sorted[Math.floor(n / 2)]` is only the middle element when `n` is odd. For even `n` the two middle indexes are `n / 2 - 1` and `n / 2`, and the contract requires their arithmetic mean.
- **Failing input:** `median([1, 2, 3, 4])` returns `3`. It must return `2.5`.
- **Fix:** When `sorted.length % 2 === 0`, return `(sorted[mid - 1] + sorted[mid]) / 2`.

### `roundCurrency`

- **What:** Some half-up cases round down. `1.005` becomes `1` instead of `1.01`.
- **Root cause:** IEEE-754 doubles cannot hold most decimal hundredths. `1.005 * 100` is `100.49999999999999`, and `Math.round` then goes to `100`. The same trap turns `1.015` into `1.01` and `9.995` into `9.99`. `2.675 * 100` happens to be `267.5`, so that example passes by accident and hides the bug.
- **Failing input:** `roundCurrency(1.005)` returns `1`. It must return `1.01`.
- **Fix:** The contract allows at most three decimal places and `amount < 10000`. Round to the nearest thousandth with `Math.round(amount * 1000)` (the error is far below half a unit in that domain), then half-up the third digit into cents. Checked for every `x.xxx` in `[0, 10000)`.

### `rangeInclusive`

- **What:** The end value is missing.
- **Root cause:** The loop condition is `i < end`, so the range is half-open. A one-element range (`start === end`) produces an empty array.
- **Failing input:** `rangeInclusive(1, 3)` returns `[1, 2]`. It must return `[1, 2, 3]`. Also `rangeInclusive(2, 2)` returns `[]` instead of `[2]`.
- **Fix:** `i <= end`.

### `groupBy`

- **What:** Keys that already exist on `Object.prototype` (`"toString"`, `"constructor"`) do not become groups. The call throws, or writes through the inherited value.
- **Root cause:** `if (!out[k])` reads the prototype chain. `out["toString"]` is a function, which is truthy, so the code never stores an array and then calls `.push` on that function. Assignment would also be wrong for `"__proto__"`, because `obj["__proto__"] = []` sets `[[Prototype]]` instead of creating an own property.
- **Failing input:** `groupBy(["a"], () => "toString")` throws `TypeError: out[k].push is not a function`. It must return `{ toString: ["a"] }`.
- **Fix:** Create the bucket only when `Object.hasOwn(out, groupKey)` is false, and store it with `Object.defineProperty` so the property is an own enumerable data property even for `"__proto__"`. Item order within each group is unchanged.

### `mapLimit`

- **What:** The index passed to `fn` restarts at 0 on every batch.
- **Root cause:** `slice.map((item, j) => fn(item, j))` uses the index inside the slice. After the first window, `j` is no longer the position in `items`. Concurrency, order, and rejection behaviour of the batched `Promise.all` already match the contract.
- **Failing input:** `mapLimit(["a", "b", "c"], 2, async (_item, index) => index)` resolves to `[0, 1, 0]`. It must resolve to `[0, 1, 2]`.
- **Fix:** Pass `i + offset`, where `i` is the start of the batch.

## Already correct

### `clamp`

`Math.max(lo, Math.min(hi, x))` is the inclusive clamp into `[lo, hi]`. Both endpoints are reachable (`clamp(1, 1, 2)` and `clamp(2, 1, 2)`), and values outside the range snap to the nearer bound. The caller guarantees `lo <= hi`, which is the only case this expression assumes. Left unchanged.

### `dedupe`

`[...new Set(items)]` drops duplicates under SameValueZero equality and keeps the first-seen order, which is the order `Set` records insertions. The input array is not mutated. Left unchanged.
