# Type-level lambda normaliser

`Normalize<S>` is a real reducer, not a table of examples. It parses the named term, switches to de Bruijn indices, reduces in normal order, and prints the canonical form.

## Pipeline

1. **Parse.** Recursive descent over the grammar in the challenge. Whitespace (space, tab, newline, carriage return, form feed, vertical tab) is skipped between tokens. Application is left-associative (`f x y` is `(f x) y`). An abstraction's body runs as far right as possible, so `\x.f x` is `\x.(f x)`, not `(\x.f) x`.

2. **de Bruijn.** A binder stack puts the nearest parameter at index 0. `\f.\x.f (f x)` becomes `\.\.(1 (1 0))` with no reduction at all. Alpha-equivalent inputs therefore render the same.

3. **Substitution.** Beta of `(\.body) arg` is the usual de Bruijn step: shift the argument up by one at each binder crossed during substitution, replace index 0, then shift the result down by one to account for the removed binder. Indices below the cutoff (variables bound inside the term being shifted) stay put, so substitution does not capture.

4. **Normal order.** Weak-head reduce the function first. Beta-reduce only when that weak-head form is an abstraction, and do not touch the argument before substituting it. That is why `(\x.\y.y) Ω` returns `\.0` instead of diverging: `Ω` is discarded because index 0 does not occur in `\y.y`. After weak-head form, the normaliser walks under lambdas and into both sides of a neutral application (one whose function is not an abstraction).

5. **Print.** `\.` for a binder, `(t u)` for an application, and a decimal index for a variable.

## Step bound

Reduction stops after **48 beta steps** and yields `"DIVERGE"`. `Ω = (\x.x x) (\x.x x)` reduces to itself, so it hits the bound. The published examples and small Church arithmetic (successor, addition and multiplication of numerals 0–3, predecessor of 1) finish in fewer than ten betas, so 48 is enough for those. A term whose normal form needs more than 48 betas is reported as `"DIVERGE"` even though it would terminate.

## Limits

- Indices only go to 40. A binding depth past that falls off the successor table.
- Inputs are assumed closed. A free name does not become a sensible index.
- Only beta, not eta. `\x.f x` stays `\.(1 0)`, not `0`.
- TypeScript's instantiation depth is a second, invisible bound. A huge term can fail to compile before the 48-step counter runs out. The terms above, including `Ω` and `K Ω`, stay inside it.
