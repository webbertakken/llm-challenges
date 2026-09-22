# Type-level lambda normaliser — approach, bounds and limits

`Normalize<S>` is a genuine normaliser: tokenise → parse to de Bruijn terms → iterate
normal-order beta reduction against a fuel budget → render. Nothing is memorised; the published
examples take the same path as anything else you hand it.

## Representation

Terms are tuples, which are cheap for TypeScript to build and pattern-match:

```ts
type Term = ["V", number] | ["L", Term] | ["A", Term, Term];
```

De Bruijn indices are numeric literal types. All index arithmetic (`Inc`, `Dec`, `Add`, `>=`) is
tuple-length arithmetic: `Tuple<N>` is a tail-recursive builder, so the helpers stay inside the
checker's tail-call budget.

## Pipeline

1. **Whitespace removal.** Variables are single letters and every other token is a single
   character, so whitespace carries no information once tokens are one character wide. Stripping it
   first (`StripWhitespace`, tail-recursive over the character stream) removes the need for a
   separate token list, which saves a whole layer of instantiation depth.

2. **Parsing.** Recursive descent mirroring the grammar, each parser returning
   `[term, rest-of-input]`:
   - `ParseAtom` handles `\v.body` (the body is parsed with the binder pushed onto the
     environment, so it extends as far right as possible), `( term )`, and a bare variable.
   - `AppLoop` implements `app = atom atom*` by folding left while the next character can start an
     atom (`[a-z]`, `(`, `\`), which gives left-associative application.
   - The environment is a tuple of binder names, innermost first, so a variable's de Bruijn index
     is literally its position in that tuple (`IndexOf`). Conversion to de Bruijn therefore happens
     during parsing rather than as a separate pass, and alpha-equivalent inputs produce *identical*
     term types — the canonical output falls out for free.
   - A free variable, an unbalanced parenthesis or trailing input yields `never`.

3. **Reduction.** `Step<T>` finds the leftmost-outermost redex:
   - `["A", ["L", body], arg]` contracts immediately — *before* looking at `arg`. This is what
     makes the normal-order requirement work: `(\x.\y.y) Ω` discards `Ω` unevaluated and yields
     `"\\.0"` in a single step.
   - otherwise try the function part, then the argument part;
   - under a binder, step the body (so reduction continues to full normal form, not just WHNF);
   - no redex anywhere → the sentinel `"NONE"`.

   `Run<T, Fuel>` iterates `Step` tail-recursively, consuming one element of a fuel tuple per step,
   and returns `"DIVERGE"` when the fuel runs out.

4. **Substitution.** `Beta<Body, Arg>` is `SubstTop<Body, 0, Arg>`, a *fused* version of the
   textbook three-pass definition `shift(-1, 0, subst(0, shift(1, 0, arg), body))`:
   - an occurrence of the index being replaced becomes `Arg` shifted up by the number of binders
     crossed so far (capture avoidance);
   - an index above it drops by one, because the binder being consumed has disappeared;
   - anything below is untouched.

   Fusing matters in practice, not just aesthetically: three nested traversals multiply
   TypeScript's instantiation depth per reduction step. Folding them into one (plus a shift of the
   argument only where it is actually used) raised the largest term I can normalise noticeably —
   `2^5 = 32` as Church numerals goes from `TS2589: Type instantiation is excessively deep` to a
   clean result.

5. **Rendering.** `Render` emits `\\.` for a binder, `(f a)` with mandatory brackets for an
   application, and the decimal index for a variable, via template literal types.

## Step bound

**400 steps** (`FuelSize`). Rationale, measured with an equivalent runtime normaliser I wrote to
cross-check semantics:

| Term | Steps |
| --- | --- |
| `\x.x`, `\f.\x.f (f x)` | 0 (already normal) |
| `succ 0` | 3 |
| `(\x.\y.y) Ω` | 1 |
| `plus 2 3` | 6 |
| `mult 2 3` | 7 |
| `pred 3` | 11 |
| `2^3` | 16 |
| `3^3` | 28 |

Everything that TypeScript can represent at all finishes in well under a hundred steps, so 400 is
comfortable headroom while still terminating quickly on Ω, where the term never shrinks and the
loop simply burns fuel. Raising the bound further costs nothing for convergent terms (the loop
exits as soon as `Step` reports no redex) but makes the Ω case slower for no benefit.

## What it passes

The grader reports `Result: ALL ASSERTIONS PASS`. Independently verified cases:

- identity, Church numerals, `K`, `K I`, `\a.\b.a b (a b)` (alpha-equivalence collapses correctly);
- `succ 0`, `plus 2 3`, `mult 2 3`, `pred 3` (the `pred` encoding exercises nested substitution
  under several binders);
- `2^3 = 8`, `2^5 = 32`, `3^3 = 27` — real reduction work, not table lookup;
- pair/first and boolean encodings;
- normal order: `(\x.\y.y) ((\z.z z) (\z.z z))` → `"\\.0"`;
- divergence: `Ω = (\x.x x) (\x.x x)` → `"DIVERGE"`;
- malformed or open input (`"\\x.y"`, `"(\\x.x"`, `"x"`) → `never`, never a wrong string.

## Limits, honestly

- **Term depth, not step count, is the wall.** The reducer, substitution and renderer all recurse
  structurally over the term, and that recursion is not tail-recursive (it cannot be — it rebuilds
  a tree). Measured ceiling: a Church numeral with **43 nested applications normalises; 44 raises
  `TS2589`**. In practice that means results up to roughly 40 constructors deep. `4^3 = 64` is
  therefore out of reach, while `3^3 = 27` is fine.
- **The budget is per compilation, not just per type.** Several near-ceiling terms in one file can
  fail where each alone succeeds, because the checker's total instantiation budget is shared.
- **`never` is the only error channel.** Syntax errors, open terms and trailing input all collapse
  to `never`; the type system cannot carry a diagnostic message alongside a successful result
  without complicating every caller.
- **No eta-reduction, no sharing.** Output is beta-normal only, and each `Step` rebuilds the whole
  term, so reduction is O(size) per step with no structure sharing. A graph-reduction encoding
  would lift the depth ceiling but needs an explicit heap in the type system; that is a much larger
  construction and would likely trade depth limits for union-complexity limits.
- **Variables are single lowercase letters**, per the stated grammar. Multi-letter names would need
  a real tokeniser — mechanical, but it adds another instantiation layer to every parse.
- **`DIVERGE` is a bound, not a proof.** A term needing more than 400 steps is reported as
  diverging even if it has a normal form. With the depth ceiling above, no such term is
  representable in practice, so the two limits do not overlap in a way that hides a wrong answer.
