/**
 * Ground-truth compile-time contract for challenge 07.
 *
 * The grader copies the candidate `solution.ts` next to this file and runs
 * `tsgo --noEmit --strict`. Every assertion must hold (zero errors).
 *
 * Input is named-syntax lambda calculus; output is canonical de Bruijn normal
 * form (see the README). String literals double their backslashes: the type
 * `"\\x.x"` is the 4-character source `\x.x`, and `"\\.0"` is `\.0`.
 *
 * These pairs mirror grader/cases.ts exactly (verified by selfcheck.ts).
 */
import type { Normalize } from "./solution.js";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

// identity
export type _1 = Expect<Equals<Normalize<"\\x.x">, "\\.0">>;
// Church 0 / 1 / 2
export type _2 = Expect<Equals<Normalize<"\\f.\\x.x">, "\\.\\.0">>;
export type _3 = Expect<Equals<Normalize<"\\f.\\x.f x">, "\\.\\.(1 0)">>;
export type _4 = Expect<Equals<Normalize<"\\f.\\x.f (f x)">, "\\.\\.(1 (1 0))">>;
// I applied to I
export type _5 = Expect<Equals<Normalize<"(\\x.x) (\\y.y)">, "\\.0">>;
// K I (...) -> I  (alpha-equivalence is handled by de Bruijn output)
export type _6 = Expect<
  Equals<Normalize<"(\\x.\\y.x) (\\a.a) (\\b.\\c.b)">, "\\.0">
>;
// SUCC 0 -> 1, SUCC 1 -> 2
export type _7 = Expect<
  Equals<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, "\\.\\.(1 0)">
>;
export type _8 = Expect<
  Equals<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.f x)">, "\\.\\.(1 (1 0))">
>;
// normal-order is mandatory: the diverging argument must be discarded -> I
export type _9 = Expect<
  Equals<Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">, "\\.0">
>;
// a Y-combinator whose body ignores the recursion -> \a.a
export type _10 = Expect<
  Equals<Normalize<"(\\f.(\\x.f (x x)) (\\x.f (x x))) (\\g.\\a.a)">, "\\.0">
>;
// PLUS 1 1 -> 2
export type _11 = Expect<
  Equals<
    Normalize<"(\\m.\\n.\\f.\\x.m f (n f x)) (\\f.\\x.f x) (\\f.\\x.f x)">,
    "\\.\\.(1 (1 0))"
  >
>;
// omega has no normal form -> the bounded reducer must yield "DIVERGE"
export type _12 = Expect<Equals<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">>;

// negative control: a correct normaliser must NOT confuse Church 1 and 2
export type _13 = Expect<
  Equals<Equals<Normalize<"\\f.\\x.f x">, "\\.\\.(1 (1 0))">, false>
>;
