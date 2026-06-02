import type { Eval } from "./solution.js";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends
  (<T>() => T extends B ? 1 : 2)
    ? true
    : false;

type Expect<T extends true> = T;

type Cases = [
  Expect<Equals<Eval<"2+3*4">, 14>>,
  Expect<Equals<Eval<"(2+3)*4">, 20>>,
  Expect<Equals<Eval<"10-2-3">, 5>>,
  Expect<Equals<Eval<"18-3*4+2">, 8>>,
  Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>,
  Expect<Equals<Eval<" 12 + ( 6 * 3 ) - 5 ">, 25>>,
  Expect<Equals<Eval<"2*3*4+5">, 29>>,
  Expect<Equals<Eval<"40-(6+4)*3">, 10>>,
  Expect<Equals<Eval<"7">, 7>>,
  Expect<Equals<Eval<"((15))">, 15>>,
];
