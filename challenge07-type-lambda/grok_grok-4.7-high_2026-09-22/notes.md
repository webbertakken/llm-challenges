# Approach

`Normalize<S>` is a real reducer, not a table of examples. It runs six stages, all as conditional types:

1. **Tokenise.** Spaces, tabs, and newlines are skipped. What remains is `\`, `.`, `(`, `)`, or one lowercase letter.
2. **Parse.** Recursive descent on the published grammar. Application is left-associative (`f x y` is `(f x) y`). An abstraction’s body runs as far right as possible (`\x.x y` is `\x.(x y)`).
3. **De Bruijn.** Binders are pushed onto the front of an environment, so index 0 is the nearest lambda. Shadowing falls out of that: the first match wins.
4. **Shift and substitute.** Beta contraction of `(\. body) arg` replaces index 0 in `body` with `arg`. Going under a lambda shifts the substitute up by one and looks for the next index, and any variable that pointed past the binder we just removed is decremented. That is capture-avoiding substitution for de Bruijn indices.
5. **Normal order, one step at a time.** A step contracts the leftmost outermost redex. The argument is not reduced before substitution, so a function that ignores its argument drops it, even when that argument is `Ω`. Lambdas are opened only when there is no redex further out, which is what full normal form (not just weak head normal form) needs.
6. **Render.** `\.` for a binder, `(a b)` for every application, and a decimal index for a variable.

The driver repeats the one-step function once per element of a fuel tuple. The tuple has **58** entries. Hitting 0 yields `"DIVERGE"`. `Ω = (\x.x x)(\x.x x)` uses the whole budget and returns that sentinel. The README examples (identity, Church 2, successor of zero, and the discarded diverging argument) all reach a normal form well inside the budget.

## Limits

- **58 beta steps.** A closed term whose normal form needs a 59th contraction is reported as `"DIVERGE"` even though it has a normal form. The published cases, including successor-of-zero, finish sooner than that.
- **Indices 0 through 64.** Successor and predecessor are lookup tables. A shift or a substitution that would build index 65 collapses to `never` instead of a string. Closed terms in the usual Church encodings stay far below that.
- **Closed terms only.** A free name has no environment entry, so the index is `never` and the term does not render.
- **Syntax.** Variables are one lowercase letter. There is no `λ`, no multi-character name, and no numeric literal in the input. Beta only: no eta.
- **Recursion budget of the compiler.** Each step walks the term. 58 is enough for the contract and still type-checks; a much larger fuel tuple can make TypeScript report “type instantiation is excessively deep” on `Ω` before the sentinel is reached.
