import type { Normalize } from "./solution.ts";

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

type _id = Expect<Equal<Normalize<"\\x.x">, "\\.0">>;
type _two = Expect<Equal<Normalize<"\\f.\\x.f (f x)">, "\\.\\.(1 (1 0))">>;
type _succ0 = Expect<
  Equal<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, "\\.\\.(1 0)">
>;
type _k_omega = Expect<
  Equal<Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">, "\\.0">
>;
type _omega = Expect<Equal<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">>;
type _zero = Expect<Equal<Normalize<"\\f.\\x.x">, "\\.\\.0">>;
type _one = Expect<Equal<Normalize<"\\f.\\x.f x">, "\\.\\.(1 0)">>;
type _id_id = Expect<Equal<Normalize<"(\\x.x) (\\y.y)">, "\\.0">>;
type _ws = Expect<Equal<Normalize<" \\x . x ">, "\\.0">>;
type _app_parens = Expect<Equal<Normalize<"(\\x.x)(\\y.y)">, "\\.0">>;
type _true = Expect<Equal<Normalize<"\\x.\\y.x">, "\\.\\.1">>;
type _false = Expect<Equal<Normalize<"\\x.\\y.y">, "\\.\\.0">>;
type _not_true = Expect<
  Equal<Normalize<"(\\p.\\a.\\b.p b a) (\\x.\\y.x)">, "\\.\\.0">
>;
type _k_const = Expect<Equal<Normalize<"(\\x.\\y.x) (\\z.z)">, "\\.\\.0">>;
type _two_id = Expect<
  Equal<Normalize<"(\\f.\\x.f (f x)) (\\z.z)">, "\\.0">
>;
type _nested_parens = Expect<Equal<Normalize<"((\\x.x))">, "\\.0">>;
type _shadow = Expect<Equal<Normalize<"\\x.\\x.x">, "\\.\\.0">>;
