# Challenge 04 — Bug hunt: subtle defect detection

**Difficulty:** Intermediate–Hard
**Topics:** Code comprehension, runtime semantics, debugging, edge cases, floating point, async/concurrency

---

## Objective

`toolkit.ts` (in this challenge folder) is a small collections-and-numbers
library. Every function has a precise contract (below). **Some functions are
correct. Others contain one or more subtle defects** that make them deviate
from their contract on certain inputs.

This challenge measures *depth of insight*: a shallow read says "looks fine",
a deep read spots the off-by-one, the lexicographic sort, the floating-point
trap, the prototype-key footgun, and the async index slip.

## What you must do

1. **Read `toolkit.ts`** in this challenge folder (you are expected to read it).
2. Find every defect by reasoning about the contracts below.
3. Produce a corrected module and a written analysis.

## Contracts

| Function | Contract |
| --- | --- |
| `isLeapYear(year)` | True iff `year` is a leap year (proleptic Gregorian: divisible by 4, except centuries unless divisible by 400). |
| `clamp(x, lo, hi)` | Clamp `x` into inclusive `[lo, hi]`; caller guarantees `lo <= hi`. |
| `chunk(arr, size)` | Consecutive chunks of length `size` (last may be shorter); `size` is a positive integer; input not mutated. |
| `median(nums)` | Numeric median; even length → mean of the two middle values; `nums` non-empty; input not mutated. |
| `dedupe(items)` | Remove duplicates, preserving first-occurrence order. |
| `roundCurrency(amount)` | Round to 2 decimals, half up (`1.005 → 1.01`, `2.675 → 2.68`); `0 <= amount < 10000`, at most 3 decimals. |
| `rangeInclusive(start, end)` | All integers from `start` to `end` **inclusive** (`start <= end`). |
| `groupBy(items, key)` | Group items by `key(item)` into a plain object; preserve order; **must work for keys like `"toString"` / `"constructor"`**; input not mutated. |
| `mapLimit(items, limit, fn)` | Map with `fn(item, index)` (index is the item's position in `items`), at most `limit` concurrent, results in input order, reject if any call rejects. |

## Deliverables

Place these **directly** in your result folder
(`challenge04-bug-hunt/[harness]_[model]_[quant]_[YYYY-MM-DD]/`):

1. `fixed.ts` — A corrected module that exports the **same public API** (same
   names, signatures and return types) as `toolkit.ts`, with every defect fixed.
2. `bugs.md` — For each defect: the function, a one-line description, the
   **root cause**, the **failing input** that exposes it, and the fix. Also
   state which functions you concluded are already correct, and why.

## Verify

Type-check your solution:

```bash
cd challenge04-bug-hunt/[your-result-folder]
npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext fixed.ts
```

Then grade behaviour from the challenge root:

```bash
cd challenge04-bug-hunt
npx tsx grader/grade.ts [your-result-folder]
```

A perfect solution prints `Score: 9/9 functions correct` and exits 0.

## Evaluation criteria

- **Correctness:** `grade.ts` score (behavioural ground truth).
- **Insight:** `bugs.md` correctly identifies root causes and the exposing
  inputs — not just "changed `<` to `<=`", but *why* it was wrong.
- **Discipline:** the two correct functions are left semantically intact and
  the public API is unchanged.

## Rules

- Read this README and `toolkit.ts`. **Do NOT read the `grader/` directory**
  (it contains the reference solution and ground-truth tests) or any sibling
  result folder.
