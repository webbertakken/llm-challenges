import type { Normalize } from "./solution.js";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

type _id = Expect<Equals<Normalize<"\\x.x">, "\\.0">>;
type _two = Expect<Equals<Normalize<"\\f.\\x.f (f x)">, "\\.\\.(1 (1 0))">>;
type _succ0 = Expect<Equals<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, "\\.\\.(1 0)">>;
type _discard = Expect<Equals<Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">, "\\.0">>;
type _omega = Expect<Equals<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">>;
type _idId = Expect<Equals<Normalize<"(\\x.x) (\\y.y)">, "\\.0">>;
type _church0 = Expect<Equals<Normalize<"\\f.\\x.x">, "\\.\\.0">>;
type _shadow = Expect<Equals<Normalize<"\\x.\\x.x">, "\\.\\.0">>;
