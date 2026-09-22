/**
 * Compile-time tests for `Normalize`.
 *
 * Run with: npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts tests.ts
 */
import type { Normalize } from "./solution.js";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

// Identity
type _id = Expect<Equal<Normalize<"\\x.x">, "\\.0">>;

// Church two
type _two = Expect<Equal<Normalize<"\\f.\\x.f (f x)">, "\\.\\.(1 (1 0))">>;

// Succ applied to zero => Church one
type _succ0 = Expect<Equal<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, "\\.\\.(1 0)">>;

// Normal order: diverging argument is discarded
type _normal_order = Expect<
  Equal<Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">, "\\.0">
>;

// Omega diverges
type _omega = Expect<Equal<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">>;

// Church zero
type _zero = Expect<Equal<Normalize<"\\f.\\x.x">, "\\.\\.0">>;

// Identity applied to itself
type _id_id = Expect<Equal<Normalize<"(\\x.x) (\\x.x)">, "\\.0">>;

export {};
