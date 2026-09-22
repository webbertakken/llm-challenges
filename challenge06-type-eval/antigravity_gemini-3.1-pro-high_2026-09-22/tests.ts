import { Eval } from "./solution.js";
type Assert<T extends true> = T;
type Eq<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type T1 = Assert<Eq<Eval<"2+3*4">, 14>>;
type T2 = Assert<Eq<Eval<"(2+3)*4">, 20>>;
type T3 = Assert<Eq<Eval<"10-2-3">, 5>>;
type T4 = Assert<Eq<Eval<"((1+2)*(3+4))">, 21>>;
type T5 = Assert<Eq<Eval<" 10 * ( 2 + 3 ) ">, 50>>;
type T6 = Assert<Eq<Eval<"100 - (10 + 2 * 3) * 2">, 68>>;
