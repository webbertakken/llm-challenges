# Type-level lambda calculus normaliser: approach and limits

## Approach

`Normalize<S>` runs a five-stage pipeline, each stage a type:

1. **`Tokenize<S>`** splits the string literal into a tuple of single-character
   tokens, discarding whitespace. Lambda terms have no multi-character tokens,
   so no token accumulation is needed.
2. **`ParseTerm`** is a recursive-descent parser over the token tuple, written
   as `ParseAtom` / `ParseAppRest` / `ParseTerm`. It returns a *named* AST:
   `["var", name]`, `["abs", name, body]`, `["app", fn, arg]`. Application is
   left-associative (the fold in `ParseAppRest`); an abstraction body calls
   `ParseTerm` again, which is what makes `\x.M` extend as far right as
   possible.
3. **`ToDeBruijn`** walks the named AST with a binder stack (innermost first)
   and replaces each name by its de Bruijn index. Alpha-equivalent inputs
   therefore become identical types at this point.
4. **`NormalizeSteps`** repeatedly applies `Step` under a fuel tuple.
5. **`Render`** prints the canonical syntax: `\.M`, `(M N)`, decimal index.

`Parse` unwraps the `[term, rest]` result and fails to `never` if any token is
left over, so malformed input cannot silently truncate.

### Reduction

Substitution is the textbook de Bruijn formulation, with two primitives:

- `ShiftUp`/`ShiftDown` add or subtract one from every index `>= cutoff`,
  incrementing the cutoff under each binder.
- `Substitute<Term, Target, Replacement>` replaces the variable equal to
  `Target`, applying `ShiftUp<Replacement, 0>` on the way into every binder.

One beta step is then exactly

```
(\.M) N  ->  ShiftDown(Substitute(M, 0, ShiftUp(N, 0)), 0)
```

which is capture-avoiding by construction: the classic
`(\x.\y.x) y` case yields `\.1`, not the wrong `\.0`.

`Step` finds the **leftmost-outermost** redex. For an application it checks the
whole application for a redex first (that is the outermost one); if there is
none it reduces the function, then the argument. For an abstraction it reduces
the body. This is normal order, so `(\x.\y.y) Ω` returns `\.0` without ever
forcing `Ω`, exactly as the specification requires.

## Step bound

The budget is a **400-step** tuple (`Fuel = Repeat<400>`). The reduction loop is
tail-recursive, so TypeScript eliminates the call frames and the 400 iterations
are cheap; each individual step only recurses over the size of the current
term. Two things stop the loop:

- `Step` returns `["normal"]`, meaning no redex exists anywhere, and the term is
  returned.
- The fuel runs out, or a **one-step cycle** is detected (`StructEq<Term, Next>`
  is true), in which case `NormalizeSteps` returns `["diverge"]` and
  `Normalize` renders the sentinel `"DIVERGE"`.

The cycle check makes `Ω = (\x.x x) (\x.x x)` fall out after a single beta
step, since normal order maps `Ω` back to itself; the fuel is a backstop for
slower loops. 400 is far more than the published cases need (Church-arithmetic
examples settle in a handful of steps) and still bounds the work for a
non-terminating input.

## What passes

- The three specification examples: `\.0`, `\.\.(1 (1 0))`, `\.\.(1 0)`.
- Church numerals 0–3, successor, addition and multiplication, and
  exponentiation (`(\m.\n.n m) 2 3` normalises to Church 8), including cases
  where the term grows substantially during reduction.
- Capture avoidance across an outer binder, e.g. `\a.(\x.\y.x) a` → `\.\.1`.
- Discarding a divergent argument: `(\x.\y.y) Ω` → `\.0`.
- `Ω` itself → `"DIVERGE"`.
- Insignificant whitespace, including leading/trailing spaces and tabs.
- Multi-letter variable names are rejected by the grammar as specified; each
  variable is a single lowercase letter.

## Limitations, honestly

- **Closed terms only.** Resolution of a free variable returns `never`, so an
  open term (e.g. `\x.y`) does not normalise. This matches the stated contract
  ("inputs are closed terms") and keeps `Normalize` total for valid inputs.
- **Beta only.** There is no eta-reduction; the specification asks for the
  beta-normal form, and eta-reducing would change the expected outputs.
- **Fuel is fixed, not adaptive.** A term needing more than 400 leftmost
  outermost steps is reported as `"DIVERGE"` even if it is strongly normalising.
  No such term appears in the published cases, but the bound is a real (and
  deliberate) limitation.
- **Compiler limits are the real ceiling.** Everything is one giant set of
  conditional-type instantiations. Very large terms (hundreds of nested
  binders, or heavy Church arithmetic) risk TypeScript's instantiation-depth
  error rather than a wrong answer. The tail-recursive loops (`Repeat`,
  `NormalizeSteps`) are the parts that scale best; the non-tail-recursive tree
  walks (`Substitute`, `ShiftUp`, `StructEq`, `Render`) are bounded by the depth
  of the current term.
- **Performance is super-linear in term growth.** Each step copies the term it
  traverses, so reduction of terms that grow quickly costs more than one
  traversal per step. For the modest terms in scope this is invisible.
- **No explicit error for malformed input.** An unparsable string produces
  `never` at an intermediate stage, and `Normalize` then resolves to `never`
  rather than a diagnostic string.
