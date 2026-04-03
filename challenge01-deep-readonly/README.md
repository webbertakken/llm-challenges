# Challenge 01 — Deep Readonly & Recursive Utility Types

**Difficulty:** Intermediate
**Topics:** Mapped types, conditional types, recursion, `readonly` modifier

---

## Objective

Implement a suite of recursive utility types that operate on arbitrarily nested object structures. These must be **type-level only** — no runtime code is required for the core deliverables, but you must provide a test harness that uses `// @ts-expect-error` to prove correctness.

## Requirements

### 1. `DeepReadonly<T>`

Recursively makes every property in `T` (and all nested objects, arrays, Maps, and Sets) `readonly`.

```ts
type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
};

type Result = DeepReadonly<Original>;
// Result.a.b.d should be readonly number[]
// Result.a.e should be ReadonlyMap<string, { readonly f: boolean }>
```

### 2. `DeepMutable<T>`

The inverse of `DeepReadonly` — strips `readonly` recursively from every property, array, Map, and Set.

### 3. `DeepPartial<T>`

Recursively makes every property optional, including nested objects. Arrays should remain arrays (not turned into optional-element tuples).

### 4. `DeepRequired<T>`

The inverse of `DeepPartial`.

### 5. `DeepPick<T, Paths>`

Pick deeply nested properties using dot-notation path strings:

```ts
type Picked = DeepPick<Original, "a.b.c" | "a.e">;
// => { a: { b: { c: number }; e: Map<string, { f: boolean }> } }
```

## Edge Cases to Handle

- Primitives at the top level (`DeepReadonly<string>` should be `string`)
- `null` and `undefined` (should pass through unchanged)
- Function properties (should remain unchanged)
- Circular reference awareness (document any limitations)
- Tuple types (`[string, number]` should remain a tuple, not become `(string | number)[]`)

## Deliverables

1. `types.ts` — All utility type definitions
2. `tests.ts` — Compile-time test file with `// @ts-expect-error` assertions proving each type works correctly and rejects invalid assignments
3. `examples.ts` — At least 3 real-world usage examples (e.g., immutable Redux state, config objects, API response types)

## Evaluation Criteria

- **Correctness:** All test cases must pass `tsc --noEmit`
- **Completeness:** All five types implemented with full edge-case coverage
- **Elegance:** Minimal, readable type definitions — avoid unnecessary complexity
