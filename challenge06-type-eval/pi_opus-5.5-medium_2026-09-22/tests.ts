import type { Eval } from "./solution.js";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

export type Tests = [
  // Literals and multi-digit numbers
  Expect<Equals<Eval<"0">, 0>>,
  Expect<Equals<Eval<"7">, 7>>,
  Expect<Equals<Eval<"42">, 42>>,
  Expect<Equals<Eval<"007">, 7>>,
  Expect<Equals<Eval<"1234">, 1234>>,

  // README examples
  Expect<Equals<Eval<"2+3*4">, 14>>,
  Expect<Equals<Eval<"(2+3)*4">, 20>>,
  Expect<Equals<Eval<"10-2-3">, 5>>,
  Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>,

  // Precedence: * binds tighter than + and -
  Expect<Equals<Eval<"2*3+4">, 10>>,
  Expect<Equals<Eval<"20-2*3">, 14>>,
  Expect<Equals<Eval<"1+2*3+4">, 11>>,
  Expect<Equals<Eval<"2*3*4-5">, 19>>,

  // Left associativity
  Expect<Equals<Eval<"10-3+2">, 9>>,
  Expect<Equals<Eval<"100-50-25-5">, 20>>,
  Expect<Equals<Eval<"2*3*4">, 24>>,

  // Parentheses override precedence and associativity
  Expect<Equals<Eval<"10-(3+2)">, 5>>,
  Expect<Equals<Eval<"10-(5-3)">, 8>>,
  Expect<Equals<Eval<"2*(3+4)*5">, 70>>,
  Expect<Equals<Eval<"(7)">, 7>>,

  // Whitespace is insignificant
  Expect<Equals<Eval<" 2 + 3 * 4 ">, 14>>,
  Expect<Equals<Eval<"( 2 +3 )*  4">, 20>>,
  Expect<Equals<Eval<"\t1\n+\r2">, 3>>,

  // Deep nesting
  Expect<Equals<Eval<"((((((((((1))))))))))">, 1>>,
  Expect<Equals<Eval<"(((((1+1)*2)+1)*2)+1)">, 11>>,
  Expect<Equals<Eval<"((((((((((((((((((((((((((((((((((((((((((((((((((1+2*3))))))))))))))))))))))))))))))))))))))))))))))))))">, 7>>,
  Expect<Equals<Eval<"((2*(3+(4*(9-(6-(7-(8-1))))))))">, 30>>,

  // Zero and identity elements
  Expect<Equals<Eval<"0*123+0">, 0>>,
  Expect<Equals<Eval<"5-5">, 0>>,
  Expect<Equals<Eval<"1*1*1*1">, 1>>,

  // Larger values
  Expect<Equals<Eval<"12*12+56">, 200>>,
  Expect<Equals<Eval<"25*40-1">, 999>>,
  Expect<Equals<Eval<"1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1">, 20>>,

  // Malformed input evaluates to never
  Expect<Equals<Eval<"">, never>>,
  Expect<Equals<Eval<"2+">, never>>,
  Expect<Equals<Eval<"(1+2">, never>>,
  Expect<Equals<Eval<"1+2)">, never>>,
  Expect<Equals<Eval<"1 2">, never>>,
  Expect<Equals<Eval<"2/1">, never>>,
  Expect<Equals<Eval<"()">, never>>,
  Expect<Equals<Eval<"(2+)+1">, never>>,
  Expect<Equals<Eval<"(1)(2)">, never>>,
  Expect<Equals<Eval<"2(3)">, never>>,
  Expect<Equals<Eval<"*2">, never>>,
  Expect<Equals<Eval<"-2">, never>>,
];

// @ts-expect-error wrong result is rejected
export type Wrong = Expect<Equals<Eval<"2+3*4">, 20>>;
