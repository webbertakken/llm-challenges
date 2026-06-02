# Challenge 07 — Type-level lambda calculus normaliser (frontier)

**Difficulty:** Frontier (may be beyond current models)
**Topics:** TypeScript type system, parsing, de Bruijn indices, capture-avoiding substitution, normal-order reduction — all at the type level

---

## Objective

Implement, **purely in the type system** (no runtime code), a normaliser for
the untyped lambda calculus:

```ts
type Normalize<S extends string> // = the beta-normal form of S, in de Bruijn form
```

```ts
type Id    = Normalize<"\\x.x">;                 // "\\.0"
type Two   = Normalize<"\\f.\\x.f (f x)">;       // "\\.\\.(1 (1 0))"
type Succ0 = Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">; // "\\.\\.(1 0)"  (= Church 1)
```

This is the capstone. It requires composing, **in types**: a tokeniser, a
recursive-descent parser, conversion to de Bruijn indices, capture-avoiding
substitution with index shifting, a normal-order reduction loop with a step
bound, and canonical rendering — while staying inside TypeScript's recursion
limits. It is included precisely because it is hard; a partial solution that
nails the easy cases is still interesting.

## Input syntax (named lambda calculus)

Whitespace between tokens is insignificant.

```
term = app
app  = atom atom*          (application, left-associative)
atom = var | "(" term ")" | abs
abs  = "\" var "." term    (body extends as far right as possible)
var  = a single lowercase letter [a-z]
```

- Inputs are **closed** terms (no free variables).
- In TypeScript string literals, backslashes double: write the source `\x.x` as
  the type `"\\x.x"`.

## Reduction semantics

- **Normal order** (leftmost-outermost). This is mandatory: an argument that has
  no normal form must still be discarded if the function ignores it, e.g.
  `Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">` is `"\\.0"`, not divergence.
- Bounded by a finite number of steps (choose a reasonable bound). If no normal
  form is reached within the bound, yield the sentinel `"DIVERGE"`. The only
  diverging grader input is `Ω = (\x.x x) (\x.x x)`.

## Output syntax (canonical de Bruijn)

Alpha-equivalent terms must render identically:

```
term = "\\." term             (abstraction; no bound-variable name)
     | "(" term " " term ")"  (application; always parenthesised)
     | <index>                (variable; 0-based de Bruijn index, as decimal)
```

Examples: identity `"\\.0"`; Church 0 `"\\.\\.0"`; Church 1 `"\\.\\.(1 0)"`;
`f x` under two binders `"\\.\\.(1 0)"`.

## Deliverables

Place this **directly** in your result folder
(`challenge07-type-lambda/[harness]_[model]_[quant]_[YYYY-MM-DD]/`):

1. `solution.ts` — exports `export type Normalize<S extends string>`.
   **Type-level only.** It must be a *general* normaliser, not a lookup table of
   the published cases (lookup-table submissions are disqualified, and graders
   may add cases).
2. `notes.md` — a short explanation of your approach, the step bound you chose,
   and which cases you can and cannot pass (be honest about limitations).

## Verify

```bash
cd challenge07-type-lambda/[your-result-folder]
npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts
```

Grade against the ground-truth contract (from the challenge root):

```bash
cd challenge07-type-lambda
npx tsx grader/grade.ts [your-result-folder]
```

A complete solution prints `Result: ALL ASSERTIONS PASS`. Partial solutions will
show which assertions fail.

The runtime file `grader/reference.ts` is the **executable specification** (a
plain normaliser) that defines the semantics and generated the expected outputs
(`grader/selfcheck.ts` proves they match). There is deliberately **no
type-level reference solution** — this is the open frontier.

## Evaluation criteria

- **Correctness:** how many of the grader's assertions pass.
- **Generality:** a real reducer, not memorised answers.
- **Honesty & insight:** `notes.md` accurately describes the approach and limits.

## Rules

- Read this README only. **Do NOT read the `grader/` directory** or any sibling
  result folder.
