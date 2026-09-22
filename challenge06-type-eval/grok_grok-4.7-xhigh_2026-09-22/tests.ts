import type { Eval } from "./solution.js";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

type _precedence = Expect<Equals<Eval<"2+3*4">, 14>>;
type _precedenceRight = Expect<Equals<Eval<"2*3+4">, 10>>;
type _parens = Expect<Equals<Eval<"(2+3)*4">, 20>>;
type _leftSub = Expect<Equals<Eval<"10-2-3">, 5>>;
type _nested = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;
type _leftMul = Expect<Equals<Eval<"2*3*4">, 24>>;
type _leftSubLong = Expect<Equals<Eval<"8-3-2-1">, 2>>;
type _mixed = Expect<Equals<Eval<"100-2*3*4">, 76>>;
type _mixed2 = Expect<Equals<Eval<"2+3*4-5">, 9>>;
type _multiDigit = Expect<Equals<Eval<"12*12">, 144>>;
type _multiAdd = Expect<Equals<Eval<"100+20+3">, 123>>;
type _zero = Expect<Equals<Eval<"0">, 0>>;
type _zeroAdd = Expect<Equals<Eval<"0+0">, 0>>;
type _zeroMulLeft = Expect<Equals<Eval<"0*8">, 0>>;
type _zeroMulRight = Expect<Equals<Eval<"8*0">, 0>>;
type _subToZero = Expect<Equals<Eval<"7-7">, 0>>;
type _subZero = Expect<Equals<Eval<"10-0">, 10>>;
type _bare = Expect<Equals<Eval<"42">, 42>>;
type _spaces = Expect<Equals<Eval<"  2 + 3 * 4  ">, 14>>;
type _parenSpaces = Expect<Equals<Eval<"( 2 + 3 ) * 4">, 20>>;
type _newlines = Expect<Equals<Eval<"(\n1\t+\r2 ) * 3">, 9>>;
type _deeper = Expect<Equals<Eval<"2*(3+(4*5))-6">, 40>>;
type _deep2 = Expect<Equals<Eval<"((8-3)*2)+1">, 11>>;
type _sumToTen = Expect<Equals<Eval<"1+2+3+4+5+6+7+8+9+10">, 55>>;
type _nestedAdds = Expect<Equals<Eval<"((((((((1+1)+1)+1)+1)+1)+1)+1)+1)">, 9>>;
type _product = Expect<Equals<Eval<"20*15">, 300>>;
type _bigAdd = Expect<Equals<Eval<"50+60+70+80">, 260>>;
type _leadingZero = Expect<Equals<Eval<"01+02">, 3>>;
type _chainSub = Expect<Equals<Eval<"100-1-1-1">, 97>>;
type _parenOnly = Expect<Equals<Eval<"(100)">, 100>>;
