import type { Normalize } from "./solution.js";

type Is<A extends B, B> = A;

type _id = Is<Normalize<"\\x.x">, "\\.0">;
type _two = Is<Normalize<"\\f.\\x.f (f x)">, "\\.\\.(1 (1 0))">;
type _zero = Is<Normalize<"\\f.\\x.x">, "\\.\\.0">;
type _one = Is<Normalize<"\\f.\\x.f x">, "\\.\\.(1 0)">;
type _succ0 = Is<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, "\\.\\.(1 0)">;
type _k = Is<Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">, "\\.0">;
type _omega = Is<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">;
type _applyId = Is<Normalize<"(\\x.x) (\\y.y)">, "\\.0">;
type _space = Is<Normalize<"  \\x . x  ">, "\\.0">;
type _kConst = Is<Normalize<"(\\x.\\y.x) (\\a.a) ((\\z.z z) (\\z.z z))">, "\\.0">;
type _add = Is<
  Normalize<"(\\m.\\n.\\f.\\x.m f (n f x)) (\\f.\\x.f (f x)) (\\f.\\x.f x)">,
  "\\.\\.(1 (1 (1 0)))"
>;
type _mul = Is<
  Normalize<"(\\m.\\n.\\f.m (n f)) (\\f.\\x.f (f x)) (\\f.\\x.f (f x))">,
  "\\.\\.(1 (1 (1 (1 0))))"
>;
type _appAssoc = Is<Normalize<"\\f.\\x.f x x">, "\\.\\.((1 0) 0)">;
