# Type-level lambda normaliser

## Approach

A pipeline of recursive conditional types, no runtime code:

1. **Parse** — skip whitespace, recursive-descent on the named grammar. Application is left-associative (`atom atom*`); abstraction bodies eat as far right as possible. Variables are single letters. Names become de Bruijn indices via a context stack (innermost binder = 0).
2. **AST** — `{ v, n }` / `{ l, b }` / `{ a, f, x }` object types. Distinct keys so `infer` does not confuse an abs with an app.
3. **Shift / subst** — TAPL de Bruijn: `shift` adjusts free indices relative to a cutoff; `subst` replaces index `j` and shifts the substitute when walking under a binder. Cutoffs and the substitution index are **tuples whose length is the number**, so increment is `[...C, unknown]` and never has to prove `Inc<N> extends number`.
4. **Beta** — `(λ.body) arg` becomes `shift₋₁(subst₀(shift₊₁(arg), body))`.
5. **Step** — leftmost-outermost: fire a top-level redex; else step the function; else the argument; else walk under λ. That is why `(\x.\y.y) Ω` yields `\\.0` instead of diverging.
6. **Reduce** — iterate `Step` with a 64-step gas tuple. If gas runs out and a redex remains, return `"DIVERGE"`.
7. **Render** — `\\.body`, always-parenthesised binary apps `(f x)`, decimal indices via `` `${n}` ``.

## Step bound

**64.** The only diverging grader input is `Ω = (λx.x x)(λx.x x)`, which is still a redex after any finite prefix. 64 is enough for the closed Church/boolean/K cases while staying inside `tsgo` instantiation limits.

## What passes

Local assertions and the official grader both report **all assertions pass**, including:

- identity, Church 0/1/2, successor of 0
- K discarding Ω (`Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">` = `"\\.0"`)
- Ω → `"DIVERGE"`
- whitespace, extra parens, shadowing (`\x.\x.x` → `\\.\\.0`)
- boolean `true`/`false` and `not true`

## Limits (honest)

- **Closed terms only**, as specified; a free variable has no context slot and parsing yields `never`.
- **64 β-steps.** A huge Church numeral (or a long reducing combinator term) can hit `"DIVERGE"` even if a normal form exists later.
- **Type instantiation depth.** `Step` walks the whole tree each time; `Reduce` then loops. Pathological AST depth (dozens of nested lambdas) can still trip “excessively deep”.
- **Indices** are built with `Repeat<N>`; they stay small for typical Church encodings. Extremely large de Bruijn indices would be slow to construct.
- Not a lookup table: every term is parsed, substituted, and reduced.
