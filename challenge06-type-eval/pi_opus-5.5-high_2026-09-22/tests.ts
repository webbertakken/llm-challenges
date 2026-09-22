import type { Add, Eval, EvalToString, Multiply, Subtract, Tokenize } from "./solution.js";

type Equals<A, B> = (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Deep nesting fixtures
type Open<N extends number, Acc extends string = "", Count extends 1[] = []> = Count["length"] extends N
  ? Acc
  : Open<N, `${Acc}(`, [...Count, 1]>;
type Close<N extends number, Acc extends string = "", Count extends 1[] = []> = Count["length"] extends N
  ? Acc
  : Close<N, `${Acc})`, [...Count, 1]>;
type Nest<N extends number, Inner extends string> = `${Open<N>}${Inner}${Close<N>}`;

export type Tests = [
  // README examples
  Expect<Equals<Eval<"2+3*4">, 14>>,
  Expect<Equals<Eval<"(2+3)*4">, 20>>,
  Expect<Equals<Eval<"10-2-3">, 5>>,
  Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>,

  // Single numbers
  Expect<Equals<Eval<"0">, 0>>,
  Expect<Equals<Eval<"7">, 7>>,
  Expect<Equals<Eval<"42">, 42>>,
  Expect<Equals<Eval<"007">, 7>>,
  Expect<Equals<Eval<"(5)">, 5>>,

  // Precedence: * binds tighter than + and -
  Expect<Equals<Eval<"1+2*3">, 7>>,
  Expect<Equals<Eval<"2*3+1">, 7>>,
  Expect<Equals<Eval<"20-2*3">, 14>>,
  Expect<Equals<Eval<"2*3*4-5">, 19>>,
  Expect<Equals<Eval<"1+2*3+4">, 11>>,
  Expect<Equals<Eval<"10-2*3-1">, 3>>,
  Expect<Equals<Eval<"2*3+4*5">, 26>>,

  // Left associativity
  Expect<Equals<Eval<"10-2-3">, 5>>,
  Expect<Equals<Eval<"10-5+3">, 8>>, // (10-5)+3, not 10-(5+3)=2
  Expect<Equals<Eval<"20-10-5-2">, 3>>,
  Expect<Equals<Eval<"2*3*4">, 24>>,
  Expect<Equals<Eval<"100-50+25-10">, 65>>,

  // Parentheses override precedence and associativity
  Expect<Equals<Eval<"2*(3+4)">, 14>>,
  Expect<Equals<Eval<"(1+2)*(3+4)">, 21>>,
  Expect<Equals<Eval<"10-(2-1)">, 9>>,
  Expect<Equals<Eval<"10-(5+3)">, 2>>,
  Expect<Equals<Eval<"(10-5)-(3-1)">, 3>>,
  Expect<Equals<Eval<"((2))*((3))">, 6>>,

  // Whitespace is insignificant between tokens
  Expect<Equals<Eval<" 2 + 3 * 4 ">, 14>>,
  Expect<Equals<Eval<"( 2 + 3 )*4">, 20>>,
  Expect<Equals<Eval<"  12   -   4  ">, 8>>,
  Expect<Equals<Eval<"\t1\n+\r\n2 ">, 3>>,

  // Nesting
  Expect<Equals<Eval<"((((((1+1))))))">, 2>>,
  Expect<Equals<Eval<"(((1+2)*3)-4)*5">, 25>>,
  Expect<Equals<Eval<"2*(3+(4*(5-(6-1))))">, 6>>,
  Expect<Equals<Eval<"((1+2)*(3+(4*5)))-((6*7)-(8+9))">, 44>>,
  Expect<Equals<Eval<Nest<50, "1+2*3">>, 7>>,
  Expect<Equals<Eval<Nest<200, "4">>, 4>>,

  // Multi-digit numbers and carries/borrows
  Expect<Equals<Eval<"99+1">, 100>>,
  Expect<Equals<Eval<"100-1">, 99>>,
  Expect<Equals<Eval<"1000-999">, 1>>,
  Expect<Equals<Eval<"12*12">, 144>>,
  Expect<Equals<Eval<"25*4-100">, 0>>,
  Expect<Equals<Eval<"123+456*2">, 1035>>,
  Expect<Equals<Eval<"999*999">, 998001>>,
  Expect<Equals<Eval<"0*12345">, 0>>,
  Expect<Equals<Eval<"1+2+3+4+5+6+7+8+9+10">, 55>>,
  Expect<Equals<Eval<"1*2*3*4*5*6">, 720>>,

  // Large values (decimal-string arithmetic, not tuple lengths)
  Expect<Equals<Eval<"65536*65536">, 4294967296>>,
  Expect<Equals<EvalToString<"123456789*987654321">, "121932631112635269">>,

  // Arithmetic building blocks
  Expect<Equals<Add<"0", "0">, "0">>,
  Expect<Equals<Add<"999", "1">, "1000">>,
  Expect<Equals<Subtract<"1000", "1">, "999">>,
  Expect<Equals<Subtract<"5", "5">, "0">>,
  Expect<Equals<Multiply<"12", "0">, "0">>,
  Expect<Equals<Multiply<"37", "27">, "999">>,

  // Lexer
  Expect<Equals<Tokenize<" 12+(3 * 45) ">, ["12", "+", "(", "3", "*", "45", ")"]>>,

  // Invalid input evaluates to never
  Expect<Equals<Eval<"">, never>>,
  Expect<Equals<Eval<"   ">, never>>,
  Expect<Equals<Eval<"1+">, never>>,
  Expect<Equals<Eval<"*2">, never>>,
  Expect<Equals<Eval<"1 2">, never>>,
  Expect<Equals<Eval<"(1+2">, never>>,
  Expect<Equals<Eval<"1+2)">, never>>,
  Expect<Equals<Eval<"()">, never>>,
  Expect<Equals<Eval<"2(3)">, never>>,
  Expect<Equals<Eval<"1/2">, never>>,
  Expect<Equals<Eval<"a+1">, never>>,
  Expect<Equals<Eval<"1--1">, never>>,
  Expect<Equals<Eval<"1-2">, never>>, // negative results are outside the natural numbers
];

// The result is a numeric literal type, so it can be used like one.
const fourteen: Eval<"2 + 3 * 4"> = 14;
// @ts-expect-error - 2+3*4 is 14, not 20
const twenty: Eval<"2 + 3 * 4"> = 20;
// @ts-expect-error - a malformed expression is never; nothing is assignable to it
const malformed: Eval<"2 +"> = 2;

export { fourteen, twenty, malformed };
