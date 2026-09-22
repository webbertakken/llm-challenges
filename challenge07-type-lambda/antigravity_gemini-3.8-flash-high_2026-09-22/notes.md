# Challenge 07 — Type-level Lambda Calculus Normaliser: Architectural Notes

## Approach & Design

This implementation builds a complete untyped lambda calculus normal-order reducer entirely within TypeScript's type system across 7 stages:

1. **Tokenization (`Tokenize`)**:
   Recursively splits the input string into significant tokens: backslashes (`\`), variable dots (`.`), structural parentheses (`(` and `)`), and variable names (letters `a-z`). Whitespace (spaces, tabs, newlines) is stripped.

2. **Scoped Parser & de Bruijn Conversion (`ParseTerm`, `ParseAppRest`, `ParseAtom`)**:
   Implements a recursive descent parser conforming to the grammar:
   - `term = app`
   - `app = atom atom*` (left-associative application)
   - `atom = var | "(" term ")" | abs`
   - `abs = "\" var "." term` (greedy rightward extension)
   
   During parsing, an environment stack `Env extends string[]` tracks bound variable names from innermost to outermost. When encountering an identifier `var`, its 0-based index in `Env` becomes its de Bruijn index (`Var<I>`). This guarantees alpha-equivalent terms map to identical de Bruijn structures immediately during parsing.

3. **Capture-Avoiding Substitution with de Bruijn Shifting**:
   - `Shift1<C, T>`: Shifts free variable indices by $+1$ for variables $\ge C$.
   - `Subst<J, S, T>`: Substitutes term $S$ for de Bruijn index $J$ in target term $T$. When crossing a lambda binder, $J$ increments to $J + 1$ and $S$ is shifted (`Shift1<0, S>`). Free variables $> J$ are decremented by 1 because the enclosing lambda binder has been discharged.

4. **Normal-Order Reduction (`Step`)**:
   Applies normal-order reduction (leftmost-outermost redex):
   - For an application `App<F, A>`:
     - If `F` is an abstraction `Abs<B>`, beta-reduction occurs immediately (`Subst<0, A, B>`).
     - Crucially, argument `A` is not evaluated prior to substitution. If the abstraction ignores its argument (e.g. $K$-combinator), unnormalisable or diverging subterms in `A` are discarded safely without triggering infinite loops.
     - If `F` is not an abstraction, `F` is reduced first. Only when `F` is in normal form is `A` reduced.
   - For an abstraction `Abs<B>`, reduction proceeds under the binder on `B`.
   - Variables are already in normal form.

5. **Loop Termination & Step Bound (`ReduceLoop`)**:
   - Chosen step bound: **100 steps** (`BuildTuple<100>`).
   - If reduction reaches normal form within 100 steps, the normal form is produced.
   - If 100 steps are exhausted, the reducer yields the sentinel literal `"DIVERGE"`.

6. **Canonical Formatting (`Format`)**:
   Recursively serializes the de Bruijn term into canonical string representation:
   - Abstraction: `\.` followed by formatted body
   - Application: `(` followed by formatted function, a space, formatted argument, and `)`
   - Variable: 0-based index formatted as a decimal string literal.

---

## Capabilities & Limitations

### Passing Cases
- **Identity & Basic Combinators**: `\x.x` $\to$ `"\\.0"`, $K$, $S$, $I$.
- **Church Numerals & Arithmetic**: Church numerals (0, 1, 2, ...), successor operations `(\n.\f.\x.f (n f x)) (\f.\x.x)` $\to$ `"\\.\\.(1 0)"`.
- **Non-strictness / Normal-Order Divergence Avoidance**: `(\x.\y.y) ((\z.z z) (\z.z z))` $\to$ `"\\.0"` passes cleanly because the normal-order redex is reduced without evaluating $\Omega$.
- **True Divergence Detection**: Self-application $\Omega = (\lambda x. x\ x)\ (\lambda x. x\ x)$ properly exhausts the 100-step limit and returns `"DIVERGE"`.

### Limitations
- **Step Bound Capacity**: Computations requiring $>100$ beta-reduction steps will report `"DIVERGE"` prematurely. While the step bound can be raised to ~250–300 without hitting TypeScript's default tail-call instantiation limit, arbitrarily deep computations cannot run indefinitely.
- **Deep AST Nesting / Type Instantiation Depth**: Very large lambda terms (with hundreds of nested applications or lambda abstractions) can hit TypeScript's hard recursion limit `TS2589: Type instantiation is excessively deep and possibly infinite`.
- **Input Scope**: Supports closed lambda terms only; free variables outside any enclosing binder will produce `never`.
