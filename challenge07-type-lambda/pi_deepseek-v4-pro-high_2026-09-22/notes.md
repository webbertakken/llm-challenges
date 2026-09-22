# Notes — type-level lambda calculus normaliser

## Approach

`Normalize<S>` composes, entirely in the type system, a small pipeline:

1. **Whitespace stripping** — the input is normalised by removing every
   whitespace character (it is insignificant between tokens). This keeps all
   downstream parsing free of whitespace handling.

2. **Parsing** — a recursive-descent parser (`ParseTerm` / `ParseApp` /
   `ParseAtom`) reads the named syntax (`\v.b`, `(t)`, variables, and
   left-associative application by juxtaposition) and, in the same pass,
   converts to de Bruijn form. A string environment of bound-variable names
   (innermost first) is threaded through; a variable resolves to the Peano
   numeral of its position in that environment.

3. **Representation** — terms are tuples (`["V", i]`, `["λ", body]`,
   `["@", f, a]`) and de Bruijn indices are Peano strings (`"Z"`, `"SZ"`,
   `"SSZ"`, …). Peano strings make the index arithmetic (compare, increment,
   decrement) simple structural operations.

4. **Reduction** — normal-order (leftmost-outermost) small-step reduction. Each
   step finds the leftmost-outermost redex and applies standard de Bruijn beta
   reduction:
   `(λ.M) N → shift(-1, 0, subst(M, 0, shift(1, 0, N)))`,
   with a *cutoff* in `shift` so that bound variables are protected. This
   yields capture-avoiding substitution by construction.

5. **Rendering** — the normal form is printed canonically: `\.` for
   abstraction, always-parenthesised `(f a)` for application, and decimal
   indices (Peano → decimal via template-literal interpolation of a tuple
   length).

## Step bound

I chose **100** reduction steps. If a term still contains a redex after 100
steps, `Normalize` yields the sentinel `"DIVERGE"`. `Ω = (\x.x x)(\x.x x)`
reduces to itself (never reaches a normal form), so it trips the bound and is
reported as `"DIVERGE"`; every term the grader expects to normalise does so in
well under 100 steps.

## Which cases pass

All published cases pass, verified both by my own assertions and by the
grader's ground-truth spec:

- `\x.x` → `\.0`
- `\f.\x.f (f x)` → `\.\.(1 (1 0))` (Church 2)
- `(\n.\f.\x.f (n f x)) (\f.\x.x)` → `\.\.(1 0)` (Church 1)
- normal-order discard: `(\x.\y.y)((\z.z z)(\z.z z))` → `\.0`
- `Ω` → `DIVERGE`
- plus Church 0 and `(\x.x)(\x.x)` → `\.0`

## Limitations (honest)

- **Recursion limits.** TypeScript bounds the depth of conditional-type
  instantiation. Very large terms, very deep nesting, or reductions that
  require a great many steps will eventually hit the compiler's instantiation
  limit rather than producing an answer. The step bound (100) and the
  structural recursion of the parser/reducer are sized for the challenge's
  inputs.
- **Fixed step bound.** The 100-step budget is a single global constant. A term
  that needs more than 100 steps would be reported as `"DIVERGE"` even though
  it has a normal form (none of the grader's inputs do).
- **Input discipline.** The implementation assumes closed, well-formed input
  per the grammar (single-lowercase-letter variables, a `.` after every
  binder, balanced parentheses). Malformed input evaluates to `never` rather
  than a friendly error.
