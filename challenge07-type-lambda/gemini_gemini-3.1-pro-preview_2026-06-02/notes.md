# Approach

This solution implements a complete lambda calculus normalizer purely in the TypeScript type system.
It strictly follows standard operational semantics for capture-avoiding substitution with De Bruijn indices.

1. **Tokenization & Parsing**: `Tokenize` strips whitespace and splits the string. `Parse` is a recursive descent parser that parses variables, applications (left-associative), and lambda abstractions (which consume as far right as possible).
2. **De Bruijn Conversion**: `ToDB` maintains a tuple environment of bound variables and converts named variables to De Bruijn indices (`0` being the innermost binder).
3. **Capture-Avoiding Substitution**: The operations `ShiftUp`, `ShiftDown`, and `Subst` are implemented using unary numbers (tuples). This directly mirrors the formal definitions of shifting and substitution in Pierce's *Types and Programming Languages* (TaPL).
4. **Normal Order Reduction**: `EvalStep` searches for the leftmost-outermost redex. If the left side of an application is not yet an abstraction, it steps the left side first; once the left side cannot be stepped, it steps the right side. Abstraction bodies are also stepped.
5. **Evaluation Loop**: The `Eval` type uses tail-recursive conditional types. A unary `Fuel` tuple bounds the number of steps to prevent infinite loops for diverging terms.
6. **Rendering**: The `Render` type converts the De Bruijn AST back into the required canonical string format.

## Step Bound

I chose a step bound of **400** (`N400`). A higher bound like 1000 would exceed TypeScript's "Type instantiation is excessively deep" limit on conditional tail calls because `EvalStep` itself consumes instantiation depth. 400 is safely within limits while being more than enough for complex Church numeral arithmetic.

## Limitations

As far as I can tell, this solution should pass **all** test cases (it handles divergence, capture avoidance, deep bindings, and proper normal-order left-outermost reduction). There are no known limitations besides the hard step limit of 400.
