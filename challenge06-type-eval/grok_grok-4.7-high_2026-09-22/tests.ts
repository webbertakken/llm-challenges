import type { Eval } from "./solution.js";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

type _precedence = Expect<Equals<Eval<"2+3*4">, 14>>;
type _parens = Expect<Equals<Eval<"(2+3)*4">, 20>>;
type _leftAssoc = Expect<Equals<Eval<"10-2-3">, 5>>;
type _nested = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;
type _whitespace = Expect<Equals<Eval<"  8 - 3 * 2 ">, 2>>;
type _mulAssoc = Expect<Equals<Eval<"2*3*4">, 24>>;
type _tabs = Expect<Equals<Eval<"1\t+\t2">, 3>>;
type _single = Expect<Equals<Eval<"7">, 7>>;
type _zero = Expect<Equals<Eval<"0+0">, 0>>;
type _subZero = Expect<Equals<Eval<"10-10">, 0>>;
type _multiDigit = Expect<Equals<Eval<"12*12">, 144>>;
type _chainSub = Expect<Equals<Eval<"200-150-25">, 25>>;
type _mixed = Expect<Equals<Eval<"2*(3+4)*5">, 70>>;
type _deep = Expect<Equals<Eval<"((((1+2)+3)+4)+5)">, 15>>;
type _hundred = Expect<Equals<Eval<"100-1">, 99>>;
type _parensOnly = Expect<Equals<Eval<"((42))">, 42>>;
type _addThenSub = Expect<Equals<Eval<"1+2+3-4">, 2>>;
type _newline = Expect<Equals<Eval<"9\n-\n4">, 5>>;
