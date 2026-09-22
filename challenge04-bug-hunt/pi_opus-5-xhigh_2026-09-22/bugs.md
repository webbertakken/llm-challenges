# Bug hunt — analysis of `toolkit.ts`

Nine exported functions, **seven of them defective** (nine defects in total: `median` and
`mapLimit` carry two each). `clamp` and `dedupe` are correct as shipped.

Summary first, detail after.

| # | Function | Defect | Exposed by |
| --- | --- | --- | --- |
| 1 | `isLeapYear` | The 400-year exception is missing | `isLeapYear(2000)` → `false` |
| 2 | `chunk` | `slice(i, size)` passes a length where an end index is wanted | `chunk([1,2,3,4,5], 2)` → `[[1,2],[],[]]` |
| 3 | `median` | Default `sort()` is lexicographic, not numeric | `median([1, 5, 10])` → `10` |
| 4 | `median` | Even length returns the upper middle instead of the mean | `median([1, 2, 3, 4])` → `3` |
| 5 | `roundCurrency` | Binary floating point puts `x * 100` just under the .5 boundary | `roundCurrency(1.005)` → `1`, `roundCurrency(2.675)` → `2.67` |
| 6 | `rangeInclusive` | Exclusive loop bound on an inclusive contract | `rangeInclusive(1, 4)` → `[1,2,3]` |
| 7 | `groupBy` | `out[k]` is truthy for inherited `Object.prototype` keys | `groupBy(["toString"], x => x)` → **throws** `TypeError` |
| 8 | `mapLimit` | `fn` receives the index within the batch, not within `items` | `mapLimit([a,b,c,d], 2, fn)` → indices `0,1,0,1` |
| 9 | `mapLimit` | Fixed batches, not a rolling pool: one slow item stalls the rest | `[1000ms, 1ms, 1ms, 1ms]` with `limit: 2` takes ~1001ms instead of ~1000ms with all the short work already done |

---

## 1. `isLeapYear` — the century exception has no exception

```ts
return year % 4 === 0 && year % 100 !== 0;
```

**Root cause.** The Gregorian rule has three clauses, not two: divisible by 4 *is* a leap year,
**unless** divisible by 100, **unless** divisible by 400. The third clause is simply absent, so
every 400-year leap year is wrongly rejected. This is the classic "it worked in 1996 and nobody
shipped in 2000" bug — the failing years are exactly the ones a casual test suite skips, because
non-century years and ordinary centuries both behave correctly.

**Failing input.** `isLeapYear(2000)` → `false` (expected `true`). Same for `1600`, `2400`, and
(proleptic) `0`.

**Fix.** Restore the third clause:

```ts
return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
```

Negative years keep working: `-400 % 400` is `-0`, which `=== 0`.

## 2. `chunk` — a length where an end index belongs

```ts
out.push(arr.slice(i, size));
```

**Root cause.** `Array#slice(start, end)` takes an **end index**, not a count. The call is correct
by accident for the first chunk only, because there `i === 0` and so `end === size === length`.
From the second iteration on, `end (= size)` is already `<= i`, so every further slice is empty.
The function still returns `ceil(n / size)` chunks, so a length check on the *outer* array passes
and hides the defect.

**Failing input.** `chunk([1,2,3,4,5], 2)` → `[[1,2], [], []]` (expected `[[1,2],[3,4],[5]]`).
`chunk([1,2,3], 1)` → `[[1],[],[]]`.

**Fix.** `arr.slice(i, i + size)`. `slice` clamps the end to the array length, so the short final
chunk falls out for free, and the input is still never mutated.

## 3 & 4. `median` — sorted as text, and the even case never averaged

```ts
const sorted = nums.slice().sort();
const mid = Math.floor(sorted.length / 2);
return sorted[mid]!;
```

**Root cause (3).** `Array#sort` with no comparator converts every element to a string and sorts by
UTF-16 code units. `[2, 10, 9]` becomes `["10", "2", "9"]` → `[10, 2, 9]`. The array *is* sorted,
just not numerically, so nothing looks wrong on inputs whose decimal representations happen to
order the same as their values (all single digits, or equal-width numbers) — which is why it
survives a quick eyeball. It also mis-handles negative numbers (`-1` sorts before `-2`... as text)
and floats.

**Root cause (4).** The contract says even length → mean of the two middle values. The code always
returns `sorted[floor(n/2)]`, which for even `n` is the *upper* of the two middles. For `n = 4` it
returns the 3rd smallest instead of the average of the 2nd and 3rd.

**Failing inputs.**
- Sort: `median([1, 5, 10])` sorts to `[1, 10, 5]` and returns `10` (expected `5`).
  `median([2, 10, 9])` sorts to `[10, 2, 9]` and returns `2` (expected `9`). Note how
  `median([1, 2, 3])` and any other single-digit input is right, which is what makes this easy to
  read past.
- Parity: `median([1, 2, 3, 4])` → `3` (expected `2.5`).

**Fix.** Sort with a numeric comparator and branch on parity:

```ts
const sorted = nums.slice().sort((a, b) => a - b);
const mid = Math.floor(sorted.length / 2);
return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
```

`nums.slice()` was already right: the input is never mutated.

## 5. `roundCurrency` — the decimal you typed is not the number you got

```ts
return Math.round(amount * 100) / 100;
```

**Root cause.** Neither `1.005` nor `2.675` exists in binary floating point. The nearest doubles are
`1.00499999999999989...` and `2.67499999999999982...`, so `amount * 100` yields
`100.49999999999999` and `267.49999999999994` — both *below* the halfway point. `Math.round` then
rounds **down**, and the documented half-up behaviour fails on exactly the inputs the contract
calls out. Nudging by `Number.EPSILON` is not a fix either: `EPSILON` is an absolute quantity, and
at `9999.005` it is orders of magnitude smaller than one ulp, so `9999.005` would still round down.

**Failing inputs.** `roundCurrency(1.005)` → `1` (expected `1.01`);
`roundCurrency(2.675)` → `2.67` (expected `2.68`); `roundCurrency(9999.005)` → `9999`.

**Fix.** Use the contract: at most 3 decimals and `amount < 10000`, so the value in *thousandths* is
an integer below 10,000,000 — far inside the exactly representable range. Recover it once, then do
the half-up step entirely in integers, so no boundary is ever decided by a rounding error:

```ts
const thousandths = Math.round(amount * 1000);          // exact: error << 0.5 thousandths
const hundredths = Math.floor(thousandths / 10);
const remainder = thousandths - hundredths * 10;        // 0..9
return (remainder >= 5 ? hundredths + 1 : hundredths) / 100;
```

`Math.round(amount * 1000)` is safe where `Math.round(amount * 100)` was not: the representation
error of a 3-decimal double is around 1e-13, which cannot move a value across a whole-thousandth
boundary, whereas the *hundredths* boundary is exactly where 3-decimal inputs sit.

## 6. `rangeInclusive` — the "inclusive" is missing

```ts
for (let i = start; i < end; i++)
```

**Root cause.** The half-open idiom (`i < end`) written against an inclusive contract. Off by one at
the top end, and worse at the degenerate end: `start === end` returns `[]` where the contract
requires a single element.

**Failing inputs.** `rangeInclusive(1, 4)` → `[1,2,3]` (expected `[1,2,3,4]`);
`rangeInclusive(3, 3)` → `[]` (expected `[3]`).

**Fix.** `for (let i = start; i <= end; i++)`.

## 7. `groupBy` — every object already has a `toString`

```ts
const out: Record<string, T[]> = {};
if (!out[k]) out[k] = [];
out[k].push(item);
```

**Root cause.** `{}` inherits from `Object.prototype`, so `out["toString"]`, `out["constructor"]`,
`out["valueOf"]`, `out["hasOwnProperty"]`… are all **truthy inherited functions**. The guard
concludes "bucket already exists", skips the initialisation, and then calls `.push` on a function:
`TypeError: out[k].push is not a function`. The type system cannot see this: `Record<string, T[]>`
promises the index signature returns `T[]`, and it lies for inherited keys.

There is a second, quieter half to the same footgun: even with a correct existence test, the plain
assignment `out["__proto__"] = []` invokes the `__proto__` **setter** inherited from
`Object.prototype`. An array is an object, so the setter accepts it and **re-points the result's
prototype** at that array instead of creating an own property. Nothing throws, `push` even appears
to work (reading `out["__proto__"]` goes back through the getter), but the group is absent from
`Object.keys(out)` and from anything that enumerates or serialises the result.

**Failing input.** `groupBy(["toString"], x => x)` → throws `TypeError`. Also
`groupBy(["constructor"], x => x)`, and `groupBy(["__proto__"], x => x)` for the second half.

**Fix.** Test for an *own* property, and write with `defineProperty` so no inherited setter can
intercept:

```ts
if (Object.prototype.hasOwnProperty.call(out, k)) {
  bucket = out[k]!;
} else {
  bucket = [];
  Object.defineProperty(out, k, { value: bucket, enumerable: true, writable: true, configurable: true });
}
bucket.push(item);
```

`Object.create(null)` would also cure the lookup, but it changes the *return type's* shape (a
null-prototype object is not deep-equal to a plain object, and loses `toString`), and the contract
says "a plain object" — so the result keeps `Object.prototype` and only the access pattern changes.

## 8 & 9. `mapLimit` — the index of the wrong thing, and batches instead of a pool

```ts
const slice = items.slice(i, i + limit);
const settled = await Promise.all(slice.map((item, j) => fn(item, j)));
```

**Root cause (8).** `j` is the index **within the current slice**, which restarts at `0` for every
batch, while the contract says `fn(item, index)` gets the item's position in `items`. The first
batch is correct, so any test with `items.length <= limit` passes and the defect hides. Everything
downstream that keys off the index (writing into a pre-sized array, correlating with a parallel
array, building a URL with a page number) silently corrupts.

**Root cause (9).** `Promise.all` per batch is a **barrier**: no item from batch 2 may start until
the slowest item of batch 1 has settled. That satisfies "at most `limit` concurrent" only in the
weakest sense — for most of the run, *fewer* than `limit` calls are in flight, so a single slow
item serialises the work behind it. The contract's intent ("at most `limit` concurrent") describes
a rolling window, which is also what any caller sizing `limit` to a rate limit or a connection pool
expects.

**Failing inputs.**
- Index: `mapLimit(["a","b","c","d"], 2, async (x, i) => `${x}${i}`)` →
  `["a0","b1","c0","d1"]` (expected `["a0","b1","c2","d3"]`).
- Batching: `mapLimit([1000, 1, 1, 1], 2, sleepThenReturn)` with `limit: 2` takes ~1001 ms; a
  rolling pool finishes all three short items while the slow one is still in flight (~1000 ms), and
  never exceeds 2 concurrent calls.

**Fix.** A pool of `min(limit, items.length)` workers, each pulling the next index off a shared
cursor and writing its result into the slot it owns:

```ts
const results: R[] = new Array<R>(items.length);
let next = 0;
const worker = async (): Promise<void> => {
  while (next < items.length) {
    const index = next; next += 1;
    results[index] = await fn(items[index]!, index);
  }
};
await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
return results;
```

Output order comes from indexed writes rather than completion order, `fn` sees the true index, at
most `limit` calls are ever in flight, and a rejection still propagates out of `Promise.all` (every
worker promise is awaited, so no rejection goes unhandled).

---

## The functions that are already correct

### `clamp`

```ts
return Math.max(lo, Math.min(hi, x));
```

Correct for the stated contract (`lo <= hi`). `Math.min(hi, x)` caps at the top, `Math.max(lo, …)`
lifts to the bottom, and because the caller guarantees `lo <= hi` the two steps cannot fight: the
result is always in `[lo, hi]` and equals `x` whenever `x` already is. The classic failure mode of
this idiom — swapping the two operations so that `lo > hi` silently returns `lo` — cannot arise
here, and the inputs outside the contract (`NaN`) are not the function's business. Left untouched.

### `dedupe`

```ts
return [...new Set(items)];
```

Correct. `Set` iterates in **insertion order**, and insertion order is first-occurrence order
because later duplicates are no-ops, so the contract's ordering requirement is met exactly. The
comparison is SameValueZero, which is the desirable behaviour for a dedupe helper: `NaN` collapses
with `NaN` (where `===` would not), while everything else matches strict equality. The input is
read, never mutated, and a fresh array is returned. Left untouched.

---

## Verification

```bash
npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext fixed.ts   # clean
npx tsx grader/grade.ts pi_opus-5-xhigh_2026-09-22                                                  # Score: 9/9 functions correct
```

Beyond the grader, the fixes were exercised against the specific witnesses listed above, plus
concurrency-peak and wall-clock probes for `mapLimit` (peak concurrency 2 with `limit: 2`; the
`[1000, 1, 1, 1]` case completes in the time of its slowest item) and non-mutation checks on the
inputs handed to `median` and `chunk`.
