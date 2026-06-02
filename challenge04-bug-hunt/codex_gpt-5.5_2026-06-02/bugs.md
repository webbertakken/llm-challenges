# Bug analysis

## Defects fixed

### `isLeapYear`

- Description: Years divisible by 400 were incorrectly rejected as non-leap years.
- Root cause: The implementation applied the "not divisible by 100" exception but omitted the "unless divisible by 400" rule.
- Failing input: `isLeapYear(2000)` returned `false`, but Gregorian rules require `true`.
- Fix: Accept years divisible by 4 when they are either not divisible by 100 or are divisible by 400.

### `chunk`

- Description: Chunks after the first were truncated or empty.
- Root cause: `arr.slice(i, size)` used `size` as an absolute end index instead of an end offset relative to `i`.
- Failing input: `chunk([1, 2, 3, 4], 2)` returned `[[1, 2], []]`, but the expected result is `[[1, 2], [3, 4]]`.
- Fix: Slice with `arr.slice(i, i + size)`.

### `median`

- Description: Numeric ordering and even-length medians were wrong.
- Root cause: `sort()` without a comparator sorts lexicographically, and the implementation always returned the upper middle element instead of averaging the two middle values for even lengths.
- Failing input: `median([1, 100, 2])` returned `100` instead of `2`; `median([1, 2, 3, 4])` returned `3` instead of `2.5`.
- Fix: Sort with `(a, b) => a - b`; return the middle element for odd lengths and the mean of the two middle values for even lengths.

### `roundCurrency`

- Description: Decimal half-up cases could round down because of binary floating-point representation.
- Root cause: Multiplying a decimal number by `100` can produce a value just below the exact half boundary, so `Math.round` sees `100.49999999999999` instead of `100.5`.
- Failing input: `roundCurrency(1.005)` returned `1`, but the expected result is `1.01`.
- Fix: Parse the decimal string to thousandths and round the third decimal digit manually.

### `rangeInclusive`

- Description: The end value was omitted.
- Root cause: The loop condition used `i < end`, making the range exclusive of `end`.
- Failing input: `rangeInclusive(1, 3)` returned `[1, 2]`, but the expected result is `[1, 2, 3]`.
- Fix: Use `i <= end`.

### `groupBy`

- Description: Keys inherited from `Object.prototype` broke grouping.
- Root cause: The accumulator was `{}`, so keys like `"toString"` resolved to inherited properties; the truthiness check then skipped array initialisation and attempted to push onto a function.
- Failing input: `groupBy(["a"], () => "toString")` threw instead of returning an object with a `"toString"` group.
- Fix: Check for own properties before reading the group and initialise inherited-key groups explicitly.

### `mapLimit`

- Description: The callback received the index within each batch, not the item's original input index.
- Root cause: The batch-local `j` from `slice.map` was passed directly to `fn`, so indices restarted at `0` for every limited batch.
- Failing input: `mapLimit(["a", "b", "c"], 2, async (_item, index) => index)` returned `[0, 1, 0]`, but the expected result is `[0, 1, 2]`.
- Fix: Pass `i + j` to `fn`.

## Functions already correct

### `clamp`

`Math.max(lo, Math.min(hi, x))` implements the inclusive clamp contract when `lo <= hi`: values below `lo` become `lo`, values above `hi` become `hi`, and in-range values are returned unchanged.

### `dedupe`

`Set` preserves insertion order and keeps the first occurrence of each distinct value, so spreading a `Set` back to an array removes duplicates while preserving first-occurrence order.
