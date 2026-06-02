# Challenge 05 — Reverse-engineer an obfuscated function

**Difficulty:** Intermediate–Hard
**Topics:** Code comprehension, bit manipulation, algorithm identification, equivalence testing

---

## Objective

`mystery.mjs` (in this challenge folder) contains a single deliberately
obscured function: opaque names, inlined magic constants, fused control flow.
It is behaviour-preserving — it computes something well-defined and classic.

Your job is to **see through the obfuscation to the intent**, then re-express it
as clean code and prove the two are behaviourally identical. This separates
models that truly understand code from those that only pattern-match syntax.

## What you must do

1. **Read `mystery.mjs`** in this challenge folder (you are expected to read it).
2. Work out exactly what it computes — the algorithm, its parameters, and its
   output format.
3. Reimplement it cleanly **from your understanding** (do not just rename the
   obfuscated source).
4. Prove behavioural equivalence with your own tests.

The mystery function is `(input: string) => string`.

## Deliverables

Place these **directly** in your result folder
(`challenge05-reverse-engineer/[harness]_[model]_[quant]_[YYYY-MM-DD]/`):

1. `solution.ts` — A clean, readable, well-typed reimplementation that exports
   `export function solution(input: string): string`. It must produce the same
   output as `mystery.mjs` for every input.
2. `analysis.md` — A written explanation: **name the algorithm** and its exact
   variant/parameters, describe what each stage of the obfuscated code does,
   state the output format, and note edge cases (empty input, non-ASCII /
   multi-byte characters, etc.).
3. `equivalence.test.ts` — Your own test harness comparing `solution` against
   `mystery.mjs` over edge cases and randomised inputs.

## Verify

Type-check:

```bash
cd challenge05-reverse-engineer/[your-result-folder]
npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts
```

Run your own equivalence harness:

```bash
npx tsx equivalence.test.ts
```

Grade against the ground-truth equivalence battery (from the challenge root):

```bash
cd challenge05-reverse-engineer
npx tsx grader/grade.ts [your-result-folder]
```

A perfect solution prints `Result: EQUIVALENT` and exits 0.

## Evaluation criteria

- **Correctness:** `grade.ts` reports zero mismatches across all inputs.
- **Identification:** `analysis.md` correctly names the algorithm and variant
  (init value, polynomial/reflection, final transform, output encoding).
- **Cleanliness:** `solution.ts` reads like idiomatic, intention-revealing code
  — not the obfuscated source with variables renamed.

## Rules

- Read this README and `mystery.mjs`. **Do NOT read the `grader/` directory**
  (it contains the reference solution) or any sibling result folder.
