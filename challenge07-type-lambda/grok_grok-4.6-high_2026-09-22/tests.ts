import type { Normalize } from "./solution.ts";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type _id = Expect<Equal<Normalize<"\\x.x">, "\\.0">>;
type _two = Expect<Equal<Normalize<"\\f.\\x.f (f x)">, "\\.\\.(1 (1 0))">>;
type _succ0 = Expect<
  Equal<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, "\\.\\.(1 0)">
>;
type _zero = Expect<Equal<Normalize<"\\f.\\x.x">, "\\.\\.0">>;
type _one = Expect<Equal<Normalize<"\\f.\\x.f x">, "\\.\\.(1 0)">>;
type _k_omega = Expect<
  Equal<Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">, "\\.0">
>;
type _omega = Expect<Equal<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">>;
type _ws = Expect<Equal<Normalize<" \\x . x ">, "\\.0">>;
type _true = Expect<Equal<Normalize<"\\x.\\y.x">, "\\.\\.1">>;
type _false = Expect<Equal<Normalize<"\\x.\\y.y">, "\\.\\.0">>;
type _i_i = Expect<Equal<Normalize<"(\\x.x) (\\x.x)">, "\\.0">>;
