# Type-level lambda calculus normaliser: notes

`solution.ts` exports `Normalize<S>`: a general normal-order normaliser written entirely in types.
There is no lookup table; every result is computed by parsing, reducing and rendering the input.
`tests.ts` holds my own compile-time assertions.

## Approach

1. **Parse (named to de Bruijn in one pass).** A tail-recursive stack machine reads the string one
   character at a time. Each open construct is a frame (`top`, `paren` or `lam`) holding the
   application built so far at that level, so application is left-associative and a lambda body
   extends as far right as possible (a `lam` frame closes only at the enclosing `)` or at the end of
   input). Variables are resolved against the environment of enclosing binders, so the de Bruijn
   index is the distance to the nearest binder with that name (shadowing works). Free variables,
   empty bodies, `()`, unbalanced parentheses and unknown characters all yield `never`.
2. **Terms.** Nodes are tuples: `["var", level, true, index]`, `["lam", level, normal, body]`,
   `["app", level, normal, fn, arg]`, with numbers as unary tuples. Each node caches its *free level*
   (1 + largest free index, 0 when closed) and whether it is already in *normal form*.
3. **Contraction (capture-avoiding substitution).** For `(\. B) A`, walking `B` at depth `d`:
   index `d` becomes `A` shifted up by `d` (so `A`'s free variables skip the binders it now sits
   under); indices above `d` drop by one; indices below `d` stay. Any subterm whose free level
   is at most the current depth (or cutoff, when shifting) cannot change and is reused as-is, so
   closed pieces (combinators, numerals) are shared, never copied.
4. **Normal-order reduction.** A zipper machine walks the term in pre-order (node, function,
   argument), which meets redexes leftmost-outermost first, and reduces under binders too (full
   beta-normal form). After a contraction it re-examines the parent only when the contractum is an
   abstraction in function position (the one way a new, earlier redex can appear); otherwise it
   continues at the contractum, so it never rescans from the root. Subterms flagged normal are
   skipped. Arguments are never evaluated before being substituted, so
   `(\x.\y.y) ((\z.z z) (\z.z z))` gives `"\\.0"`.
5. **Render.** A stack machine prints `\\.` + body, `(f a)` and decimal indices, so
   alpha-equivalent terms render identically.

### Staying inside TypeScript's limits

- **Recursion.** Tail-recursive conditional types get at most 1000 iterations, and non-tail
  instantiation nests only about 100 levels deep. Terms met during reduction are far deeper than
  that (factorial of 3 reaches depth 44 and 1 430 nodes), so parser, substituter, reducer and
  renderer are all flat machines with explicit stacks. Each one runs in slices of 750 iterations
  and returns `["more", state]`; a tail-recursive driver resumes it.
- **Lazy tuple elements.** TypeScript resolves tuple elements lazily. A cached field written as
  `Pred<LevelOf<Body>>` inside a tuple therefore builds a chain of unevaluated conditionals as
  deep as the term, which blows the nesting limit when finally forced. The constructors compute
  the cached fields first (`... extends infer L ? ["lam", L, N, Body] : never`).
- **No structural term comparison.** `[A] extends [B]` on big recursive tuples is unreliable
  because TypeScript assumes deeply nested types are related. An early version detected Ω by
  comparing terms and falsely reported `DIVERGE` for factorial. Decisions now match only node
  tags, cached flags and string sentinels.
- **Instantiation budget (5M per checked type).** Caching free levels and normality keeps the
  work roughly proportional to the parts of the term that actually change.

## Step bound

**5 000 beta-reductions** (a two-digit unary counter, 100 x 50). If no normal form is reached
within the bound, the result is `"DIVERGE"`. Ω uses the whole budget cheaply: about 0.5 s and
280k instantiations. No cycle detection is used, because exact term equality is not available
cheaply (see above).

## What passes

- The grader: `Result: ALL ASSERTIONS PASS`.
- My `tests.ts` (all green): the README examples; left-associative application; greedy lambda
  bodies; whitespace; shadowing; alpha-equivalence; capture avoidance (`\y.(\x.\y.x) y` gives
  `\.\.1`); reduction under binders; S K K; normal order discarding a divergent argument (in three
  shapes); Church succ, plus, mult, exponentiation (2^3, 3^2), predecessor (including pred 0) and
  mixed expressions; `isZero`; **factorial 3 through the Y combinator** (646 beta steps);
  divergence for Ω, `\x.Ω` and `Y (\x.x)`; malformed or open input gives `never`.
- While building it I also ran two differential test batches (not shipped) against an
  independent runtime normal-order normaliser: 300 random closed terms and 120 random Church
  arithmetic expressions (succ, pred, plus, mult, pow and subtraction, up to 744 steps and
  1 500-node terms). All matched.
- Deep terms: normal forms nested 200 levels deep (application spines, lambda chains) normalise
  and render.

## Limitations (honest)

- **Heavy reductions exhaust the compiler, not the step bound.** Factorial of 4 via Y needs about
  3 900 steps on terms of about 2 700 nodes. That is within the step bound, but it goes past
  TypeScript's 5M-instantiation budget (roughly 5.9M), so the compiler reports "Type instantiation
  is excessively deep" instead of producing a result. The practical ceiling is roughly 1 000 to
  2 000 steps on terms up to about 1 500 nodes.
- **Divergence that grows is not reported as `DIVERGE`.** A divergent term whose size grows each
  step, such as `(\x.x x x) (\x.x x x)`, hits the instantiation budget before 5 000 steps and
  gives a compile error. Ω, and divergent terms that stay small, correctly give `"DIVERGE"`. A
  fuel measure counting all machine work, not just beta steps, would fix this at the cost of
  more bookkeeping.
- **Input length.** The parser is a single tail-recursive loop over characters, so inputs are
  limited to about 1 000 characters.
- **Output values.** De Bruijn indices are unary tuples, so they are rendered via `length`; this
  is fine for any realistic binder depth.
