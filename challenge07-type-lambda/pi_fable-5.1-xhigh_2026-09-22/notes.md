# Notes: type-level lambda calculus normaliser

## Approach

`Normalize<S>` is a pipeline of five type-level stages, all in `solution.ts`:

1. **Lexer** (`Chars`): splits the string literal into a tuple of characters
   and drops whitespace. Every token of the grammar is a single character, so
   no further tokenisation is needed.
2. **Parser** (`ParseTerm`, `ParseApplications`, `ParseAtom`): recursive
   descent over the character tuple, carrying an environment tuple of the
   enclosing binder names (innermost first). A variable is resolved to its de
   Bruijn index on the spot (`IndexOf`), so the parser emits de Bruijn terms
   directly and there is never a named AST to convert. Application is folded
   left-associatively; an abstraction body extends as far right as possible
   because `ParseTerm` only stops at `)` or end of input.
3. **Terms** are tuples: `["v", Index]`, `["l", Body]`, `["a", Fn, Arg]`.
   Indices are natural numbers encoded as tuples (`[]`, `[unknown]`, ...),
   which turns "index >= cutoff", "index == depth" and "index + k" into tuple
   pattern matches and spreads instead of arithmetic.
4. **Reduction**: `Step<T>` performs one leftmost-outermost (normal-order)
   beta reduction and returns `null` when `T` is already in normal form. A
   redex `(\.B) A` is contracted with `Instantiate<B, A>`, the standard
   single-pass de Bruijn substitution: the bound variable at the current depth
   is replaced by `A` shifted past that many binders (`Shift`), free variables
   above it are decremented because their binder disappeared, and everything
   else is untouched. Because the argument is only ever substituted, never
   reduced first, an ignored argument is discarded unevaluated, which is what
   makes `(\x.\y.y) Ω` normalise to `\.0`.
5. **Rendering** (`Render`): the canonical output syntax. De Bruijn indices
   make alpha-equivalent terms identical, so no further canonicalisation is
   required.

## Step bound

Reduction runs in `Bursts = 100` rounds of `BurstSize = 50` steps (plus one
trailing step per round), so about **5,100 beta reductions** in total before
the result is `"DIVERGE"`. Both loops are tail-recursive conditional types, so
each stays far below TypeScript's per-loop limit of 1,000 iterations while
their product gives a budget large enough for real programs.

## What passes

Verified with both `tsgo` (7.0 preview) and `tsc` 5.7:

- All published examples: identity, Church 2, `succ 0`, the ignored-argument
  case `(\x.\y.y) Ω`, and `Ω` itself yielding `"DIVERGE"` (~0.4 s).
- Combinators `K`, `S`, `S K K = I`, Church booleans with `if`, capture cases
  such as `\y.(\x.\y.x y) y` giving `\.\.(1 0)`, arbitrary whitespace.
- Church arithmetic: `plus 2 3`, `mult 2 3`, `mult 4 5`, `pred 3`, `exp 2 3`,
  `exp 3 3` (27), and **factorial 3 via the Y combinator** (646 steps, terms
  up to about 1,400 nodes; roughly 1 s).
- Growing divergent terms such as `(\x.x x x) (\x.x x x)` also reach
  `"DIVERGE"`, just more slowly than `Ω` because each step is larger.

## Limitations

- **Work budget, not step budget, is the real ceiling.** `fact 4` (3,873
  steps, terms of ~2,700 nodes) produces the correct Church 24 but TypeScript
  reports TS2589 (instantiation count exceeded) alongside it. Anything of that
  size or larger should be considered unsupported.
- **Instantiation depth.** `Step`, `Instantiate`, `Shift` and `Render` recurse
  along the term's nesting depth (not tail-recursive), so a term nested deeper
  than roughly 100 binders/applications in a single spine would trip
  TypeScript's depth limit. None of the tested programs come close.
- **Free variables.** Inputs are assumed closed as the spec says; a free
  variable makes `IndexOf` yield `never`, which propagates to a `never`
  result rather than an error message.
- **Single-letter names only**, per the grammar. Multi-letter identifiers
  would be parsed as an application of single-letter variables.
- The normaliser is fully general: no case is special-cased or looked up.
