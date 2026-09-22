# Type-level lambda normaliser — notes

## Approach

Four stages, each a family of type aliases, composed by `Normalize<S>`:

1. **Whitespace removal.** Every token in this grammar is a single character
   (`\`, `.`, `(`, `)`, one lowercase letter), so whitespace carries no
   information whatsoever: `"f x"` and `"fx"` are the same term. Stripping it up
   front removes an entire class of special cases from the parser.
2. **Parsing straight into de Bruijn form.** A recursive-descent parser with one
   alias per grammar rule (`ParseAtom`, `ParseTerm`, `ParseApp`), threading a
   context of binder names (innermost first). A variable is resolved to its
   index by its position in that context, so names never enter the term
   representation and alpha-equivalent inputs are literally the same type.
   Terms are tagged tuples: `["v", Nat]`, `["l", Body]`, `["a", Fn, Arg]`.
3. **Normal-order reduction.** `Step<T>` performs exactly one leftmost-outermost
   contraction and returns `["some", T']` or `["none"]`; `Reduce<T, Budget>`
   iterates it while the budget lasts. The order inside `Step` is what makes it
   normal order: contract the term itself if it is a redex, otherwise recurse
   into the function, only then into the argument, and reduce under binders so
   the result is a full normal form rather than a weak head normal form. Because
   the redex test comes before the argument, `(\x.\y.y) Ω` discards `Ω` instead
   of chasing it.
   Substitution is the textbook de Bruijn triple: `ShiftUp` (`↑¹`), `Subst`
   (raising the index and shifting the replacement under each binder — this is
   what makes it capture-avoiding without renaming) and `ShiftDown` for the
   variable that the beta step consumed.
4. **Rendering.** A straight fold to the canonical text, with indices printed via
   `${Idx["length"]}`.

Natural numbers (de Bruijn indices, the fuel) are tuple lengths, which is the
only way to do arithmetic in the type system: `Inc` prepends, `Dec` destructures,
`AtLeast<A, B>` is `A extends [...B, ...unknown[]]`, and equality compares
`["length"]`.

### Two traps worth recording

- **Do not constrain the helpers with `T extends Term`.** `Term` is a recursive
  union, so the compiler eagerly resolves each alias against it: `Render` then
  tries to build an infinite union of output strings (`TS2590`), and every
  reduction step structurally re-checks a growing term against a recursive union
  (`TS2321`, excessive stack depth). The helpers are deliberately unconstrained
  and discriminate on the tags instead. This one change is the difference
  between "does not compile at all" and "normalises 3³ in half a second".
- **Do not use `never` as the parse-failure value.** `never extends Parsed<infer
  T, infer Rest>` is *vacuously true*, and the inference variables then fall back
  to their constraints — `Rest` becomes the whole type `string`, which matches
  `` `${infer C}${infer R}` `` with `C = R = string` and the parser loops
  forever. Failure is therefore an explicit sentinel (`["err"]`), and only
  `Normalize` converts it to `never` at the boundary.

## Step bound

**600 steps** (`type StepBudget = Fuel<600>`), after which the result is
`"DIVERGE"`.

The reasoning: the realistic workloads settle far below that — measured with a
runtime model of the same algorithm, `succ 0` takes 3 steps, `plus 1 2` 6,
`mult 2 3` 7, `pred 3` 11, `mult 4 5` 11, `3³ = 27` 26 steps, `2⁵ = 32` 62 —
while 600 stays inside TypeScript's 1000-deep tail-recursion window, so `Ω`
returns `"DIVERGE"` rather than blowing the compiler up. Raising the bound to 800
also works for `Ω`, but it buys nothing: the binding constraint above ~600 steps
is the instantiation budget, not the fuel.

## What it does and does not do

Verified passing (`npx tsx grader/grade.ts …` reports **`Result: ALL ASSERTIONS
PASS`**), plus a local battery of 29 assertions covering:

- identity, Church numerals, `succ`, `pred`, `plus`, `mult`, exponentiation
  (`3³ = 27`, `2⁵ = 32`), `S K K = I`, church booleans and `if`;
- normal order proper: `(\x.\y.y) ((\z.z z) (\z.z z))` → `"\\.0"`, i.e. the
  non-terminating argument is discarded;
- `Ω = (\x.x x) (\x.x x)` → `"DIVERGE"`;
- left-associative application, maximal-munch abstraction bodies, redundant and
  nested parentheses, arbitrary whitespace (including tabs and newlines);
- alpha-equivalence (`\x.x` and `\q.q` render identically), shadowing
  (`\x.\x.x` → `"\\.\\.0"`);
- malformed input → `never`: empty string, unbalanced parentheses on either
  side, `"()"`, stray characters, and open terms (free variables).

Known limits, honestly:

- **Deep terms.** Every traversal (`Step`, `Subst`, `Render`) recurses once per
  node of depth, and TypeScript caps that. Empirically the ceiling is a syntax
  tree about **50 levels deep**: Church 45 normalises, Church 50 raises
  `TS2589`. So `mult 10 10` (Church 100) is out of reach, while everything of
  grader size is comfortable. This is a limit on the *depth* of intermediate and
  final terms, not on their total size or on the number of steps.
- **Long reductions.** Around 600+ steps on non-trivial terms the instantiation
  budget runs out before the fuel does. Concretely, `fact 3` written with the Y
  combinator needs 646 steps and raises `TS2589` even with the budget raised to
  800. Church arithmetic, combinators and boolean logic all land far inside the
  envelope; general recursion through a fixed-point combinator does not.
- **Divergence that grows.** `Ω` is reported as `"DIVERGE"` because its
  intermediate terms stay the same size. The bare Y combinator
  `\f.(\x.f (x x)) (\x.f (x x))` also has no normal form, but each step makes the
  term one level deeper, so it hits the depth ceiling above and surfaces as a
  compiler error (`TS2589`) instead of `"DIVERGE"`. No step bound fixes this —
  only one small enough (under ~50) to be useless for real work. The challenge
  states that `Ω` is the only diverging grader input, which is exactly the
  well-behaved case.
- **Scope of the grammar.** Single-letter lowercase variables, closed terms, no
  `let`, no literals — as specified. Anything else resolves to `never` rather
  than to a misleading answer.

## Verification

```bash
npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts
cd .. && npx tsx grader/grade.ts pi_opus-5-xhigh_2026-09-22   # Result: ALL ASSERTIONS PASS
```
