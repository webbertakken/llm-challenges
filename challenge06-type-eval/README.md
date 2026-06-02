# Challenge 06 — Type-level arithmetic evaluator

**Difficulty:** Hard
**Topics:** TypeScript type system, template literal types, recursive conditional types, type-level parsing and arithmetic

---

## Objective

Implement a **type-level** arithmetic expression evaluator. Given an arithmetic
expression encoded as a string literal type, compute its integer result as a
numeric literal type — entirely in the type system, with **no runtime code**.

```ts
type A = Eval<"2+3*4">;        // 14   (precedence: * before +)
type B = Eval<"(2+3)*4">;      // 20   (parentheses)
type C = Eval<"10-2-3">;       // 5    (left-associative)
type D = Eval<"((1+2)*(3+4))">;// 21   (nesting)
```

This probes whether a model can *compute* in the type system: tokenise, parse
with correct precedence and associativity, and do natural-number arithmetic via
tuple-length tricks — composing many recursive conditional types correctly.

## Grammar

Whitespace between tokens is insignificant.

```
expr   = term (("+" | "-") term)*
term   = factor ("*" factor)*
factor = number | "(" expr ")"
number = digit+
```

- Operators: `+`, `-`, `*`. `*` binds tighter than `+`/`-`. All
  left-associative.
- Operands are non-negative integer literals. Inputs are chosen so that every
  intermediate and final value is a non-negative integer (no negatives, no
  division). Keep values modest (results fit comfortably under a few hundred).

## Deliverables

Place this **directly** in your result folder
(`challenge06-type-eval/[harness]_[model]_[quant]_[YYYY-MM-DD]/`):

1. `solution.ts` — exports `export type Eval<S extends string>` implementing the
   evaluator. **Type-level only**; no runtime exports required.
2. `tests.ts` — your own compile-time assertions (e.g. an `Expect<Equals<…>>`
   harness) demonstrating precedence, associativity, parentheses, whitespace,
   and nesting.

## Verify

```bash
cd challenge06-type-eval/[your-result-folder]
npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts tests.ts
```

Grade against the ground-truth contract (from the challenge root):

```bash
cd challenge06-type-eval
npx tsx grader/grade.ts [your-result-folder]
```

A perfect solution prints `Result: ALL ASSERTIONS PASS` and exits 0. (The
grader copies your `solution.ts` next to a hidden spec and type-checks it; your
`Eval` is imported via `import type { Eval } from "./solution.js"`.)

## Evaluation criteria

- **Correctness:** passes the grader's contract (precedence, associativity,
  parentheses, whitespace, nesting).
- **Robustness:** handles multi-digit numbers and deep nesting without breaking.
- **Elegance:** readable type definitions; clear separation of lexing, parsing,
  and arithmetic.

## Rules

- Read this README only. **Do NOT read the `grader/` directory** (it contains
  the reference solution and the ground-truth spec) or any sibling result
  folder.
