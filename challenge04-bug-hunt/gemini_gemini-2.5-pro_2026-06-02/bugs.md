## Correct Functions

### `clamp(x, lo, hi)`

- **Conclusion:** Correct.
- **Reasoning:** The implementation `Math.max(lo, Math.min(hi, x))` is a standard and robust idiom for clamping a value within an inclusive range. It correctly handles all cases where `x` is below, within, or above the range `[lo, hi]`.

### `dedupe(items)`

- **Conclusion:** Correct.
- **Reasoning:** The implementation `[...new Set(items)]` correctly leverages the properties of JavaScript's `Set`. `Set` automatically handles uniqueness and preserves the insertion order of the first occurrence of each element, which perfectly matches the function's contract.

---

## Defective Functions

### `isLeapYear(year)`

- **Description:** The function fails to identify century years divisible by 400 as leap years.
- **Root Cause:** The logic is incomplete. It correctly excludes non-century leap years divisible by 100, but it lacks the clause `|| year % 400 === 0` to make an exception for years divisible by 400.
- **Failing Input:** `isLeapYear(2000)` returns `false` when it should return `true`.
- **Fix:** Add `|| year % 400 === 0` to the return condition.

### `chunk(arr, size)`

- **Description:** The function produces incorrect chunks (often empty) after the first one.
- **Root Cause:** The `slice` method's second argument is the end index, but the code was passing the chunk `size` instead of the calculated end index `i + size`.
- **Failing Input:** `chunk([1, 2, 3, 4, 5], 2)` returns `[[1, 2], [], []]` instead of `[[1, 2], [3, 4], [5]]`.
- **Fix:** Change `arr.slice(i, size)` to `arr.slice(i, i + size)`.

### `median(nums)`

- **Description:** The function has two defects: it sorts numbers incorrectly and does not handle even-length arrays as specified.
- **Root Cause (1):** The code calls `nums.slice().sort()` without a comparator function. This results in a lexicographical (string-based) sort, not a numerical sort.
- **Failing Input (1):** `median([10, 1, 2])` incorrectly sorts to `[1, 10, 2]` and returns `10` instead of the correct median `2`.
- **Fix (1):** Provide a numeric comparator: `sort((a, b) => a - b)`.
- **Root Cause (2):** For an array with an even number of elements, the function returns the higher of the two middle elements instead of their arithmetic mean.
- **Failing Input (2):** `median([1, 2, 3, 4])` returns `3` instead of the correct median `2.5`.
- **Fix (2):** Add a check for even length and, if so, calculate and return `(sorted[mid - 1] + sorted[mid]) / 2`.

### `roundCurrency(amount)`

- **Description:** The function fails to correctly round numbers that end in `.xx5` due to floating point representation issues.
- **Root Cause:** Standard binary floating-point arithmetic cannot precisely represent all decimal fractions. `1.005 * 100` can result in a number slightly less than `100.5` (e.g., `100.499...`), which `Math.round` then rounds down incorrectly.
- **Failing Input:** `roundCurrency(1.005)` returns `1.00` instead of `1.01`.
- **Fix:** Add `Number.EPSILON` to the amount before multiplication and rounding. This nudges the value just enough to overcome the imprecision for half-way cases without affecting other values.

### `rangeInclusive(start, end)`

- **Description:** The function excludes the `end` value from the returned range.
- **Root Cause:** The `for` loop condition is `i < end`, which terminates the loop before `i` can become equal to `end`. The contract requires an inclusive range.
- **Failing Input:** `rangeInclusive(1, 5)` returns `[1, 2, 3, 4]` instead of `[1, 2, 3, 4, 5]`.
- **Fix:** Change the loop condition to `i <= end`.

### `groupBy(items, key)`

- **Description:** The function fails when a key collides with a property on `Object.prototype`, such as `"constructor"` or `"toString"`.
- **Root Cause:** The output object is created with `{}`, so it inherits from `Object.prototype`. The check `!out[k]` then incorrectly finds the inherited prototype property, and the subsequent attempt to `push` to it throws a `TypeError`.
- **Failing Input:** `groupBy([{id: 1}], item => 'constructor')` throws an error instead of returning `{ constructor: [{id: 1}] }`.
- **Fix:** Create a null-prototype object using `Object.create(null)`, which prevents any potential key collisions with built-in object properties.

### `mapLimit(items, limit, fn)`

- **Description:** The index passed to the mapping function `fn` is incorrect for all but the first chunk of items.
- **Root Cause:** The code passes `j`, which is the index within the temporary `slice`, instead of the item's true index in the original `items` array.
- **Failing Input:** `mapLimit(['a', 'b', 'c'], 2, (item, index) => `\${item}:\${index}`)` would produce `['a:0', 'b:1', 'c:0']` instead of the correct `['a:0', 'b:1', 'c:2']`.
- **Fix:** Calculate the correct index by adding the slice's starting offset: `fn(item, i + j)`.
