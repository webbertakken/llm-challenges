# Type-level lambda normaliser

## Approach

A four-stage pipeline, all as recursive conditional types:

1. **Parse** the named syntax with recursive descent (`term = atom+`, abstraction body extends as far right as possible). Whitespace is skipped; atoms start with a letter, `(`, or `\`.
2. **Convert to de Bruijn** by walking an environment string (innermost binder first). Bound names disappear; variables become 0-based indices.
3. **Reduce** with normal order:
   - `Whnf` contracts the leftmost-outermost redex, without reducing under λ or reducing an argument first. An immediate `(\.b) a` is a **tail-recursive** step so Ω does not blow the instantiation stack.
   - `Nf` takes WHNF, then recursively normalises under λ and on both sides of a residual application.
   - Substitution is the combined de Bruijn rule: replace index `depth` with `shift(arg, depth)`, decrement indices `> depth` (the binder vanished), leave smaller indices alone.
4. **Print** canonical de Bruijn: `\.body`, always-parenthesised `(f a)`, decimal indices.

## Step bound

**128** beta reductions (`Fuel = 8 × 4 × 4`). The README states that the only diverging grader input is `Ω = (\x.x x) (\x.x x)`. Ω matches the tail-recursive redex case, so the bound is counted rather than hitting “type instantiation is excessively deep”. Normalising terms that need more than 128 betas would be reported as `"DIVERGE"` — a limitation, not a crash.

## What this should pass

- Published cases: identity `"\\x.x"` → `"\\.0"`; Church 2 `"\\f.\\x.f (f x)"` → `"\\.\\.(1 (1 0))"`; sucessor applied to Church 0 → Church 1 `"\\.\\.(1 0)"`.
- K combinator discarding Ω: `"(\\x.\\y.y) ((\\z.z z) (\\z.z z))"` → `"\\.0"`.
- Ω itself → `"DIVERGE"`.
- Nested parentheses, extra whitespace, Church 0 / 1, small applications (`I`, `K`, `succ`, `true`/`false` if/then).

## What may fail

- Large Church arithmetic (e.g. `3 3` or `plus 4 4`) can exceed either the 128-step budget or TypeScript’s non-tail recursion depth inside `Nf`/`Subst` on the swollen term.
- Open terms (free variables) are outside the spec and yield `never`.
- Multi-digit de Bruijn indices work via `` `${I}` ``, but only if the index is a numeric literal TypeScript can print.
