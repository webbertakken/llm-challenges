# Type-level lambda calculus normaliser: notes

`Normalize<S>` in `solution.ts` is a general normal-order reducer written purely in types. There is no lookup
table: every input is lexed, parsed, reduced step by step and rendered. It passes the grader
(`Result: ALL ASSERTIONS PASS`) and a much larger battery of my own, described below.

## Approach

The one design rule: **nothing recurses on the shape of the term.** TypeScript allows a tail-recursive
conditional type about 1000 iterations, but nested (non-tail) evaluation only about 100 levels. A naive
recursive parser, substitution or printer therefore dies on terms a few dozen levels deep. Every stage is
instead a tail-recursive loop over explicit state.

1. **Lex.** A character loop into tokens (`\`, `.`, `(`, `)`, `a`–`z`); whitespace is dropped.
2. **Parse straight to de Bruijn.**
   - A shift-reduce loop over a stack of open frames (root, group, abstraction), where each frame holds the
     left-associative application built so far.
   - An abstraction frame stays open until the `)` or end of input that closes its enclosing group, which is
     exactly "the body extends as far right as possible".
   - A variable's index is the number of abstraction frames above its binder, so shadowing is handled for free.
3. **Terms.**
   - `["var", I]`, `["lam", Body, Scope]` and `["app", F, A, Scope]`. Indices are unary tuples (`2` = `[1, 1]`).
   - *Scope* is one more than the largest free index (`[]` for closed terms). The smart constructors
     `Lam`/`App` maintain it in O(1).
4. **Substitution with shifting** (standard de Bruijn β: replace index 0, lower the other free indices, and
   shift the argument's free variables by the depth at which it is inserted).
   - One iterative rewriter drives it, with a work stack and a result stack.
   - Thanks to the scope annotation, any subterm the rule cannot touch is reused without being visited. Closed
     arguments, the common case, are never copied or shifted. This cut the cost of `fact 3` by 4× in
     instantiations and 7× in time.
5. **Normal-order reduction** is a zipper machine walking leftmost-outermost:
   - At an application it checks for a redex first, then searches the function, then the argument.
   - After contracting, it resumes *at the reduct*. Everything to its left is already normal, and only the
     parent application can have become a redex (when the reduct sits in its function position).
   - When it ascends past the root, the rebuilt term is the normal form.
6. **Render** is an iterative printer: `\.` + body, `(f a)`, decimal indices.

Engineering details that keep it inside the compiler's limits:
- Stacks and the zipper path are linked lists, so push and pop are O(1). With flat tuples, a term that grows
  deep made every step cost O(depth).
- Counters use an O(1) successor table instead of growing tuples.
- Long loops are chunked. The machine hands its state back to a driver loop every 800 transitions. The
  rewriter and renderer nest one level every 500 iterations.

## Step bound

**10,000 β-steps**, run as 25 rounds × 400 steps so that no single loop exceeds 1000 iterations. A term that
needs exactly 10,000 steps is normalised, and one that needs 10,001 yields `"DIVERGE"`. I tested both, using
Church exponentiation chains padded with identity redexes. Ω reaches the bound in about one second, because
each Ω step contracts a cached, unchanged redex.

## Verification

Expected outputs come from an independent runtime normaliser I wrote for the purpose: recursive, named →
de Bruijn, counting steps with the same semantics. It was compared against the type-level `Normalize`
(scratch test files, not part of the deliverable):

- **README examples:** all pass, including the discarded Ω argument and `Ω → DIVERGE`.
- **37 classic terms:**
  - combinators: I, K, S, SKK, S K I y;
  - Church arithmetic: numerals, succ, add, mul, 2³, 3², 2⁴, 3³ (normal form Church 27), pred, sub 5 2;
  - booleans (and, or, not), iszero, pairs (fst, snd);
  - Ω handling: K I Ω, the discarded-Ω case, Ω itself;
  - binding: shadowing and capture-avoidance cases;
  - heavy terms: factorial of 2 and of 3 via the Y combinator (`fact 3` needs 646 steps with terms of up to
    1,430 nodes).

  All pass as separate assertions, and also bundled into one statement (one shared instantiation budget) in
  about 2 s.
- **300 random closed terms:** random names, shadowing, redundant parentheses and random whitespace.
- **120 random combinator expressions** needing up to 465 steps.
- **Stress:**
  - `fact 4`: 3,873 steps, 2,732-node terms, result Church 24, in about 7 s;
  - `2^10 K I`: normal form nested 1,026 levels deep, in 2.5 s;
  - `Y K`, which grows forever: correctly `"DIVERGE"` after 10,000 steps, in about 10 s.
- **Malformed input or free variables** evaluate to `never`.

## What it cannot do (honest limits)

- **Anything that needs more than 10,000 steps reports `"DIVERGE"`** even if it would eventually normalise.
  That is the contract of a step bound. `fact 5` (26,898 steps) exceeds it.
- **Compiler budget.** TypeScript stops after about 5 million type instantiations per statement (TS2589).
  - `fact 4` fits.
  - Heavier computations will eventually hit TS2589 rather than return a result.
  - Memory can reach about 2 GB on the heaviest terms above.
- **Input length.** The lexer and parser are single tail loops, so sources are limited to about 1,000
  characters. Reduction and printing are chunked and have no such limit.
- **Very large intermediate terms** are slow: cost scales with the work done, not with nesting depth.
- **Only the specified grammar is accepted** (single-letter lowercase variables, closed terms). Anything else is
  `never`, not an error message.
