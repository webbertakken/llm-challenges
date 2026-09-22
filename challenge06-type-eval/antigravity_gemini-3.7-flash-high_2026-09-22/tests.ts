/**
 * Compile-time tests for Challenge 06: Eval<S>
 */

import type { Eval } from "./solution.js";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2
  ? true
  : false;

type Expect<T extends true> = T;

// 1. Basic Single Operations
type T1 = Expect<Equals<Eval<"5">, 5>>;
type T2 = Expect<Equals<Eval<"2 + 3">, 5>>;
type T3 = Expect<Equals<Eval<"10 - 4">, 6>>;
type T4 = Expect<Equals<Eval<"6 * 7">, 42>>;

// 2. Multi-digit Operands
type T5 = Expect<Equals<Eval<"12 + 34">, 46>>;
type T6 = Expect<Equals<Eval<"100 - 37">, 63>>;
type T7 = Expect<Equals<Eval<"15 * 12">, 180>>;

// 3. Operator Precedence (* before + / -)
type T8 = Expect<Equals<Eval<"2+3*4">, 14>>;
type T9 = Expect<Equals<Eval<"2*3+4">, 10>>;
type T10 = Expect<Equals<Eval<"20 - 2 * 3">, 14>>;
type T11 = Expect<Equals<Eval<"3 * 4 - 2 * 5">, 2>>;

// 4. Associativity (Left-associative)
type T12 = Expect<Equals<Eval<"10 - 2 - 3">, 5>>;
type T13 = Expect<Equals<Eval<"20 - 5 - 3 - 2">, 10>>;
type T14 = Expect<Equals<Eval<"2 * 3 * 4">, 24>>;
type T15 = Expect<Equals<Eval<"1 + 2 + 3 + 4">, 10>>;

// 5. Parentheses & Overriding Precedence
type T16 = Expect<Equals<Eval<"(2+3)*4">, 20>>;
type T17 = Expect<Equals<Eval<"2*(3+4)">, 14>>;
type T18 = Expect<Equals<Eval<"(10 - 2) - 3">, 5>>;
type T19 = Expect<Equals<Eval<"10 - (2 - 1)">, 9>>;

// 6. Deep Nesting
type T20 = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;
type T21 = Expect<Equals<Eval<"(((2 + 3) * (4 - 1)) + ((6 * 2) - 2))">, 25>>;
type T22 = Expect<Equals<Eval<"(2 * (3 + (4 * (5 - 3))))">, 22>>;

// 7. Whitespace Insensitivity
type T23 = Expect<Equals<Eval<"   42   ">, 42>>;
type T24 = Expect<Equals<Eval<"  2  +   3 *  4  ">, 14>>;
type T25 = Expect<Equals<Eval<"(  2 + 3 ) * 4 ">, 20>>;
type T26 = Expect<Equals<Eval<"\t10\n-\t2\r-\n3 ">, 5>>;
