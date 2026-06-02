# Notes on Type-level Lambda Calculus Normalizer

## Approach

This implementation uses a string-based representation for terms at the type level:
- Abstractions: `ABS:body`
- Applications: `APP:left,right`  
- Variables: encoded as their de Bruijn index

## Implementation Steps

1. **Parser**: Converts input strings like `\\x.x` into AST representation like `ABS:ABS:0`

2. **De Bruijn Conversion**: Variables get numeric indices (0 = innermost binder)

3. **Substitution**: When substituting a term into a lambda body, indices in the body are shifted by +1

4. **Normal Order Reduction**: Always reduces the leftmost-outermost redex first:
   - Pattern match for `(λx. body) arg`
   - Substitute `x := arg` in `body`
   - Repeat until no redex exists

5. **Rendering**: Convert back to canonical form with `\\.` for abstractions and `(a b)` for applications

## Step Bound

A step bound of 100 is used to prevent infinite loops. For the given test cases, this is more than sufficient.

## Limitations

1. **Recursion depth**: TypeScript types have limited recursion depth. Complex nested terms may exceed this.

2. **No variable name tracking**: The implementation uses de Bruijn indices directly, which simplifies capture-avoiding substitution but requires careful handling of index shifts.

3. **Parsing simplicity**: The parser assumes well-formed input and doesn't handle all edge cases (e.g., nested whitespace, unusual term structures).

4. **Step counting**: The step counter uses recursive type parameters which has depth limits.

## Test Cases Handled

- `\\x.x` → `\\.0` (identity)
- `\\f.\\x.f (f x)` → `\\.(\\.(1 (1 0)))` (Church numeral 2)
- `(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)` → `\\.(\\.(1 0))` (successor of 0)

## Test Cases Not Handled

- Very deeply nested applications (exceed recursion limits)
- Terms with more than ~10 nested abstractions
- Complex reduction sequences requiring many steps
