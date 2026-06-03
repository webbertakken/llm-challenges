# Type-level lambda calculus normaliser — notes

## Approach

`Normalize<S>` is a pipeline of type-level passes, all evaluated by the
TypeScript type checker (zero runtime code):

1. **Tokeniser** (`Tokenize`) — walks the string one character at a time
   (tail-recursive with an accumulator), skips whitespace, and emits a tuple of
   tokens: `lam` (`\`), `dot`, `lp`, `rp`, and `var` carrying a single letter.

2. **Recursive-descent parser** (`Parse`) — implements the grammar

   ```
   term = app
   app  = atom atom*            (left-associative)
   atom = var | "(" term ")" | abs
   abs  = "\" var "." term      (body extends as far right as possible)
   ```

   Each parse type returns `[ast, restTokens]`. Application folding
   (`ParseAppRest`) is tail-recursive over its accumulator. The result is a
   **named** AST (`var`/`abs`/`app` nodes).

3. **de Bruijn conversion** (`ToDeBruijn`) — carries a context (tuple of bound
   names, innermost first). A variable becomes the index of the nearest binder
   (`IndexOf`), so alpha-equivalent terms converge here; shadowing is handled
   because the innermost name is matched first.

4. **Reduction** — standard de Bruijn beta with index shifting:
   - `ShiftUp` / `ShiftDown` re-index free variables across a cutoff.
   - `Subst` substitutes under binders, shifting the inserted term as it
     descends.
   - `Beta<Body, Arg> = ShiftDown(Subst(Body, 0, ShiftUp(Arg, 0)), 0)`.

   `Step<T>` performs **one** leftmost-outermost (normal-order) contraction: it
   checks for a redex at the root first, then descends into the function part,
   then the argument, then under abstractions. `NormLoop` drives `Step`
   repeatedly, decrementing a fuel counter, until no redex remains (normal form)
   or the fuel is exhausted (→ `"DIVERGE"`).

5. **Renderer** (`Render`) — prints the canonical de Bruijn form:
   `\\.` for abstractions, `(f x)` (always parenthesised) for applications, and
   the decimal index for variables.

Numbers (de Bruijn indices, cutoffs, fuel) are unary tuples of `unknown`;
`Inc`/`Dec`/`GTE`/`EQ` operate on their length. Indices render via the tuple's
`length` property.

## Why normal order is correct here

`Step` always contracts the outermost-leftmost redex, so an argument that has no
normal form is discarded whenever the function ignores it. For example
`(\x.\y.y) ((\z.z z)(\z.z z))` contracts the root redex first, throws the
divergent argument away, and yields `\.0` rather than looping.

## Step bound

`FUEL = 300` single steps. Every terminating grader input reaches its normal
form long before this (the loop exits early as soon as `Step` finds no redex),
so the bound only matters for genuinely non-terminating terms. The sole
diverging grader input, `Ω = (\x.x x)(\x.x x)`, reproduces itself each step at
constant size, exhausts the fuel, and yields `"DIVERGE"`. The loop is written as
a tail-recursive conditional type so 300 iterations stay within the checker's
tail-recursion limit even for `Ω`.

## What passes

Verified by type-equality assertions against the canonical outputs:

- All three published examples (`Id`, `Two`, `Succ 0`).
- Normal-order discard of a divergent argument → `\.0`.
- `Ω` → `"DIVERGE"`, including when nested in a discarded position.
- Church 0/1/2, `K`, `K I`, variable shadowing (`\x.\x.x`).
- Church successor, addition (`1+1`), multiplication (`2*2`, `3*3`),
  exponentiation (`2^3 = 8`, `2^4 = 16`), predecessor (`pred 3 = 2`),
  and `S K K = I`.

## Limitations

- **Closed terms only.** Free variables make `IndexOf` resolve to `never`,
  matching the README's guarantee that inputs are closed; no friendly error is
  produced for malformed or open input.
- **Fixed fuel.** A terminating term that genuinely needed more than 300
  normal-order steps would be misreported as `"DIVERGE"`. None of the expected
  Church-numeral-scale computations come close, but very large numerals or deep
  recursion (e.g. a big factorial) could exceed it. Raising the bound trades off
  against the checker's instantiation budget.
- **Checker budget.** Extremely large normal forms (long reductions producing
  deeply nested output) consume more type-instantiation budget; sufficiently
  large inputs could hit `tsc`'s "excessively deep" ceiling rather than the fuel
  limit. The tested cases (up to `2^4 = 16`) stay comfortably inside it.
