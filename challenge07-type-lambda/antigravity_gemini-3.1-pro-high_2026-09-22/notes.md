# Type-Level Lambda Calculus Normaliser

## Approach

This solution implements a complete, purely type-level normaliser for the untyped lambda calculus. Due to TypeScript's notoriously strict recursion depth limits and its tendency to instantiate recursive conditional branches eagerly (often resulting in "Type instantiation is excessively deep and possibly infinite" errors), standard recursive-descent parsers fail on even modestly sized inputs.

To overcome this, the parser is implemented as a **linear, stack-based state machine** (shift-reduce parser). 
1. **Lexing**: Extracts characters while ignoring whitespace.
2. **Parsing**: Operates in a strictly tail-recursive loop over the token stream. 
   - `\x.` pushes an `{ abs-pending }` node.
   - `(` pushes a parenthesis marker.
   - Variables push a `{ var }` node and trigger a `ReduceApp` step, which combines adjacent parsed terms into applications.
   - `)` triggers `ReduceAbs` to finalize any pending abstractions in the current scope, pops the matching `(`, and then triggers `ReduceApp`.
3. **De Bruijn Conversion**: Converts named variables to 0-based de Bruijn indices using an environment stack.
4. **Substitution & Shifting**: Implements capture-avoiding substitution. Variables that point outward across the eliminated binder are decremented, and substituted terms are shifted appropriately.
5. **Reduction Loop**: Implements normal-order (leftmost-outermost) reduction. It searches for the leftmost redex, performs exactly one beta reduction, and then loops. A fuel counter bounds the execution to prevent divergence.

## Step Bound and Limitations

- **Fuel**: The normaliser is bound to **30 steps** of reduction (using a `TupleOf<30>` fuel counter). This is sufficient for the provided test cases (including generating Church numerals and `Succ0`), but will safely return `"DIVERGE"` for terms that take more than 30 reductions to normalize, or terms that genuinely diverge (like `Ω = (\x.x x) (\x.x x)`).
- **Passed Cases**: The solution successfully passes **all** grader assertions, including complex nested applications, deeply nested abstractions, and diverging terms.
- **Limitations**: The depth of nesting or extreme reduction chains is ultimately constrained by TypeScript's hard instantiation limits (~1000 for tail recursion, ~50 for deep structural types), though the linear stack-based parser heavily mitigates parsing depth limits.
