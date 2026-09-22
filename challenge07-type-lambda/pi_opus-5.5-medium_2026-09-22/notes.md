# Type-level lambda calculus normaliser: notes

## Approach

`Normalize<S>` is a pipeline of four type-level stages, all in `solution.ts`:

1. **Lexer** (`Lex`): tail-recursive walk over the string producing tokens `\`, `.`, `(`, `)` and
   single letters; whitespace is dropped, any other character makes the result `never`.
2. **Parser** (`ParseTerm` / `AppTail` / `ParseAtom`): recursive descent over
   `term = atom atom*`, `atom = var | "(" term ")" | "\" var "." term`. Application is folded
   left-associatively; an abstraction body is parsed with `ParseTerm`, so it extends as far right as
   possible. Variables are resolved to **de Bruijn indices during parsing** using an environment of
   enclosing binder names (innermost first), so shadowing (`\x.\x.x`) is handled for free and free
   variables yield `never`.
3. **Normaliser**: normal order via "weak-head normalise, then normalise the pieces":
   - `Machine` / `Whnf`: a Krivine-style machine with a focus term and an argument stack. Unwinding
     an application pushes its argument; an abstraction meeting a pending argument performs a beta
     step. Arguments are never reduced here, so an argument is only ever normalised once it is known
     to survive, which is exactly leftmost-outermost order (`(\x.\y.y) Ω` gives `\.0`).
   - `Normal`: if the weak-head normal form is an abstraction, normalise its body; otherwise the head
     is a variable and its arguments are normalised left to right (`NormalArgs`).
   - **Substitution** (`Instantiate` + `Lift`): for `(\. B) A`, walk `B` under `D` binders; index `D`
     is replaced by `A` with its free variables lifted by `D`, indices above `D` drop by one (the
     binder disappears), indices below `D` are untouched. This is capture-avoiding by construction.
4. **Renderer** (`Render`): `\.body`, `(f a)` and decimal indices.

Numbers (indices, binder depths) are unary tuples. Every stage returns `never` on malformed input.

## Step bound

- The budget is **10 000 beta reductions** (`StepBoundHundreds = 100`). When it runs out the result
  is `"DIVERGE"`; `Ω = (\x.x x) (\x.x x)` reaches it in about 1.5 seconds of type-checking.
- Fuel is a base-100 pair of tuples (`[hundreds, units]`), so spending a step is O(1) and the
  budget is not limited by TypeScript's 10 000-element tuple cap.
- TypeScript stops any single tail-recursive conditional loop after 1000 iterations. The weak-head
  machine therefore runs in bursts of 500 transitions, returning a `"more"` state that the `Whnf`
  driver resumes; this is what allows budgets far larger than 1000.

## What passes

- All README examples, the grader contract (`Result: ALL ASSERTIONS PASS`) and my own `tests.ts`:
  identity, Church numerals, successor, `K I Ω` (normal order discards the divergent argument),
  `Ω` gives `"DIVERGE"`, whitespace, left-associativity, maximal abstraction bodies, shadowing,
  alpha-equivalence, capture-avoiding substitution (`\y.(\x.\y.x) y` gives `\.\.1`), reduction under
  binders, `S K K`, the Y combinator applied to a constant function, Church `plus`, `mult`, `pow`
  (2^3, 2^5 and 3^3 all verified), `pred` and **factorial of 3 via the Y combinator**.

## Limitations (honest)

- **Instantiation budget:** TypeScript aborts a single type evaluation after about 5 million type
  instantiations. Factorial of 3 needs about 0.35 million; factorial of 4 computes the right answer
  but also trips `TS2589`, so it counts as a failure. Heavy call-by-name workloads (normal order
  duplicates work) hit this long before the 10 000-step bound.
- **Nesting depth:** the parser, `Normal` and `Render` recurse structurally (not tail-recursively).
  Terms nested about 40 levels deep work (Church 40 renders fine); around 60 levels the
  instantiation depth limit is hit.
- **Growing divergent terms** such as `(\x.x x x) (\x.x x x)` blow the instantiation limits before
  the step bound runs out, so they produce a compiler error instead of `"DIVERGE"`. Only `Ω`-style
  divergence (constant-size loops) reliably yields the sentinel, which is the only diverging case the
  challenge promises.
- Syntax is exactly the challenge grammar: single-letter variables, one binder per `\`.
