import { Normalize } from "./solution.js";
type Assert<T extends true> = T;
type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type Id = Assert<Eq<Normalize<"\\x.x">, "\\.0">>;
type Two = Assert<Eq<Normalize<"\\f.\\x.f (f x)">, "\\.\\.(1 (1 0))">>;
type Succ0 = Assert<Eq<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, "\\.\\.(1 0)">>;
type Om = Assert<Eq<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">>;
