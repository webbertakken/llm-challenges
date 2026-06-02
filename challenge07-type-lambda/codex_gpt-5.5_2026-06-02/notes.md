# Approach

`solution.ts` implements a purely type-level pipeline:

1. Tokenise the input string, ignoring whitespace.
2. Parse the named lambda calculus with a recursive-descent parser.
3. Convert names to de Bruijn indices using a nearest-binder environment.
4. Reduce by normal order with type-level shifting and substitution.
5. Render the resulting de Bruijn AST in the canonical syntax.

The reducer uses a 100-step fuel bound. If reduction still has work after the
bound is exhausted, `Normalize<S>` yields `"DIVERGE"`.

I verified the exported file with:

```bash
npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts
```

I also temporarily checked type assertions for the README examples, the
normal-order discard case, `Ω`, shadowing, outer references, left-associative
application, and a nested beta case. I did not run the grader because this run's
hard rules forbid reading or referencing `challenge07-type-lambda/grader/`.

Known limits: inputs must be closed and syntactically valid as specified. Terms
that need more than 100 normal-order beta steps return `"DIVERGE"`.
