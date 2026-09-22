# Type-Level Lambda Calculus Normaliser: Architecture & Notes

## Architecture Overview

The normaliser in `solution.ts` implements a full, principled reduction pipeline purely within the TypeScript type system:

1. **Tokenisation (`Tokenize`)**:
   - Decomposes string literals into strongly typed token tuples (`\`, `.`, `(`, `)`, and variable tokens).
   - Strips arbitrary whitespace between tokens.

2. **Parsing (`ParseTerm`, `ParseApp`, `ParseAtom`)**:
   - Implements a recursive descent parser for the named lambda calculus grammar.
   - Preserves left-associativity for application chains (`atom atom*`) and right-extending abstraction bodies (`\var.term`).

3. **De Bruijn Conversion (`ToDeBruijn`)**:
   - Converts named identifiers into numeric 0-based de Bruijn indices using a compile-time scoping environment stack.
   - Eliminates alpha-conversion overhead and guarantees canonical structural equality.

4. **Capture-Avoiding Shifting & Substitution (`Shift`, `Substitute`)**:
   - Implements the standard De Bruijn substitution calculus $\uparrow^d_c(t)$ and $[j \mapsto s](t)$.
   - Properly shifts free variables when crossing binder boundaries and decrements variable indices upon beta-reduction of an enclosing redex.

5. **Normal-Order Reduction Loop (`Step`, `ReduceLoop`)**:
   - Implements single-step leftmost-outermost reduction.
   - Discards unused arguments without evaluating them, correctly terminating on expressions like $(\lambda x. \lambda y. y) \; \Omega$.

6. **Canonical Formatting (`Render`)**:
   - Formats the resulting normal form into canonical de Bruijn strings (e.g. `\\.0`, `\\.\\.(1 (1 0))`, `(${fn} ${arg})`).

---

## Step Bound & Complexity

- **Step Bound:** 120 reduction steps (instantiated as `BuildTuple<120>`).
- **Rationale:** 120 reduction steps provide sufficient headroom for standard Church numeral operations (successor, addition, multiplication, booleans, pairing), while safely staying within TypeScript's maximum recursive instantiation depth limits and terminating gracefully on non-terminating expressions ($\Omega = (\lambda x. x \; x)(\lambda x. x \; x)$) with the sentinel `"DIVERGE"`.

---

## Capabilities & Limitations

- **Passed Cases**:
  - Identity, $K$, $S$, $I$ combinators.
  - Church numerals ($0, 1, 2, 3, \dots$).
  - Successor and basic arithmetic over Church numerals.
  - Normal-order evaluation dropping non-terminating subterms ($K \; I \; \Omega \to I$).
  - Divergence detection yielding `"DIVERGE"` on self-application loops ($\Omega$).
- **Limitations**:
  - Complex computations requiring $> 120$ beta reductions will exhaust fuel and yield `"DIVERGE"`.
  - Extremely deep nested terms (recursion depth $> 500$) may approach TypeScript compiler stack limits.
