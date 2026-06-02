# Type-level Lambda Calculus Normaliser

## Approach
My implementation follows these steps:
1. **Tokeniser**: A recursive type that splits the input string into a list of tokens (`\`, `.`, `(`, `)`, variables `a-z`, and whitespace).
2. **Parser**: A recursive-descent parser that converts the token list into an Abstract Syntax Tree (AST). The AST uses de Bruijn indices internally to handle alpha-equivalence easily.
   - AST structure:
     - `Var<Index>`: Variable with de Bruijn index.
     - `Abs<Body>`: Lambda abstraction.
     - `App<Func, Arg>`: Application.
3. **De Bruijn Conversion**: During parsing, a scope (list of variable names) is maintained to resolve names to indices.
4. **Reduction (Normal Order)**:
   - Implements beta-reduction using a capture-avoiding substitution mechanism that involves index shifting.
   - Normal order (leftmost-outermost) reduction is performed recursively.
   - A step bound is implemented to prevent infinite recursion and detect divergence.
5. **Canonical Rendering**: Converts the final AST back into the specified canonical de Bruijn string format.

## Step Bound
I chose a step bound of **50** to stay within TypeScript's recursion limits while still being able to normalize non-trivial terms like Church numerals and standard combinators.

## Limitations
- **Recursion Depth**: Large terms or complex reductions may hit TypeScript's maximum instantiation depth.
- **Divergence**: The `DIVERGE` sentinel is returned if the step bound is exceeded.
- **Complexity**: The capture-avoiding substitution and shifting logic is complex to implement purely in types and might have edge cases for very deep nesting.

## Self-Evaluation
- Correctly handles basic identity, abstractions, and simple applications.
- Should pass Church numeral calculations (e.g., `Succ0`) if within the step limit.
- Correctly yields `DIVERGE` for the Ω combinator.
