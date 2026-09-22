import type { Eval } from "./solution.js";

/* ------------------------------------------------------------------ *
 * Compile-time assertion helpers                                      *
 * ------------------------------------------------------------------ */

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

/* ------------------------------------------------------------------ *
 * Examples from the specification                                     *
 * ------------------------------------------------------------------ */

type SpecA = Expect<Equal<Eval<"2+3*4">, 14>>;
type SpecB = Expect<Equal<Eval<"(2+3)*4">, 20>>;
type SpecC = Expect<Equal<Eval<"10-2-3">, 5>>;
type SpecD = Expect<Equal<Eval<"((1+2)*(3+4))">, 21>>;

/* ------------------------------------------------------------------ *
 * Precedence                                                          *
 * ------------------------------------------------------------------ */

type P1 = Expect<Equal<Eval<"2+3*4">, 14>>;
type P2 = Expect<Equal<Eval<"2*3+4">, 10>>;
type P3 = Expect<Equal<Eval<"2*3+4*5">, 26>>;
type P4 = Expect<Equal<Eval<"7-2*3">, 1>>;
type P5 = Expect<Equal<Eval<"2+3*4-6">, 8>>;
type P6 = Expect<Equal<Eval<"2*(3+4)*5">, 70>>;

/* ------------------------------------------------------------------ *
 * Associativity (left)                                                *
 * ------------------------------------------------------------------ */

type A1 = Expect<Equal<Eval<"10-2-3">, 5>>;
type A2 = Expect<Equal<Eval<"100-10-20-30">, 40>>;
type A3 = Expect<Equal<Eval<"2*3*4">, 24>>;
type A4 = Expect<Equal<Eval<"1+2+3+4+5">, 15>>;
type A5 = Expect<Equal<Eval<"9-4+1">, 6>>;
type A6 = Expect<Equal<Eval<"18-3*4+2">, 8>>;

/* ------------------------------------------------------------------ *
 * Parentheses and nesting                                             *
 * ------------------------------------------------------------------ */

type N1 = Expect<Equal<Eval<"(2+3)*4">, 20>>;
type N2 = Expect<Equal<Eval<"((1+2)*(3+4))">, 21>>;
type N3 = Expect<Equal<Eval<"(((7)))">, 7>>;
type N4 = Expect<Equal<Eval<"((((((((1+2))))))))">, 3>>;
type N5 = Expect<Equal<Eval<"(1+2)*(3+4)">, 21>>;
type N6 = Expect<Equal<Eval<"((2+2)*(2+2))+(1*1)">, 17>>;
type N7 = Expect<Equal<Eval<"2*(3*(4+1))">, 30>>;
type N8 = Expect<Equal<Eval<"(1)+(2)*(3)">, 7>>;

/* ------------------------------------------------------------------ *
 * Multi-digit numbers                                                 *
 * ------------------------------------------------------------------ */

type M1 = Expect<Equal<Eval<"100">, 100>>;
type M2 = Expect<Equal<Eval<"12*12">, 144>>;
type M3 = Expect<Equal<Eval<"100+200">, 300>>;
type M4 = Expect<Equal<Eval<"600-1">, 599>>;
type M5 = Expect<Equal<Eval<"123+456">, 579>>;
type M6 = Expect<Equal<Eval<"9*9*9">, 729>>;
type M7 = Expect<Equal<Eval<"999-899">, 100>>;

/* ------------------------------------------------------------------ *
 * Whitespace (spaces, tabs and newlines are insignificant)            *
 * ------------------------------------------------------------------ */

type W1 = Expect<Equal<Eval<" 1 + 2 ">, 3>>;
type W2 = Expect<Equal<Eval<"  7  -  2  *  3  ">, 1>>;
type W3 = Expect<Equal<Eval<"1\t+\n2">, 3>>;
type W4 = Expect<Equal<Eval<" ( 2 + 3 ) * 4 ">, 20>>;
type W5 = Expect<Equal<Eval<"\n\t 42 \r\n">, 42>>;
type W6 = Expect<Equal<Eval<"2 * 3 + 4 * 5">, 26>>;

/* ------------------------------------------------------------------ *
 * Zero and identity                                                   *
 * ------------------------------------------------------------------ */

type Z1 = Expect<Equal<Eval<"0">, 0>>;
type Z2 = Expect<Equal<Eval<"0+0">, 0>>;
type Z3 = Expect<Equal<Eval<"0*999">, 0>>;
type Z4 = Expect<Equal<Eval<"5*(0+0)">, 0>>;
type Z5 = Expect<Equal<Eval<"7-7">, 0>>;
type Z6 = Expect<Equal<Eval<"0+5-3">, 2>>;

console.log("challenge06 compile-time type assertions passed");
