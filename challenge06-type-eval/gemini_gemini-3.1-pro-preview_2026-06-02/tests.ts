import type { Eval } from "./solution.js";

type Expect<T extends true> = T;
type Equals<X, Y> =
    (<T>() => T extends X ? 1 : 2) extends
    (<T>() => T extends Y ? 1 : 2) ? true : false;

type T1 = Expect<Equals<Eval<"2+3*4">, 14>>;
type T2 = Expect<Equals<Eval<"(2+3)*4">, 20>>;
type T3 = Expect<Equals<Eval<"10-2-3">, 5>>;
type T4 = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;
type T5 = Expect<Equals<Eval<" 10 + 20 ">, 30>>;
type T6 = Expect<Equals<Eval<"100">, 100>>;
type T7 = Expect<Equals<Eval<"10*0">, 0>>;

console.log("All type checks passed!");
type T8 = Expect<Equals<Eval<"100*2+50">, 250>>;
type T9 = Expect<Equals<Eval<"100*(2+5)">, 700>>;
