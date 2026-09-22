/**
 * Compile-time assertions for the type-level evaluator.
 * `npx tsgo --noEmit ... solution.ts tests.ts` passing IS the test run.
 */
import type { Eval } from "./solution.js";

/** Invariant type equality. */
type Equals<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

/* -------------------------------------------------------------------------- */
/* Single values and multi-digit numbers                                      */
/* -------------------------------------------------------------------------- */

type _n1 = Expect<Equals<Eval<"0">, 0>>;
type _n2 = Expect<Equals<Eval<"7">, 7>>;
type _n3 = Expect<Equals<Eval<"42">, 42>>;
type _n4 = Expect<Equals<Eval<"007">, 7>>;
type _n5 = Expect<Equals<Eval<"250">, 250>>;

/* -------------------------------------------------------------------------- */
/* The four worked examples from the brief                                    */
/* -------------------------------------------------------------------------- */

type _e1 = Expect<Equals<Eval<"2+3*4">, 14>>;
type _e2 = Expect<Equals<Eval<"(2+3)*4">, 20>>;
type _e3 = Expect<Equals<Eval<"10-2-3">, 5>>;
type _e4 = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;

/* -------------------------------------------------------------------------- */
/* Precedence: * binds tighter than + and -                                   */
/* -------------------------------------------------------------------------- */

type _p1 = Expect<Equals<Eval<"2+3*4">, 14>>;
type _p2 = Expect<Equals<Eval<"3*4+2">, 14>>;
type _p3 = Expect<Equals<Eval<"20-2*3">, 14>>;
type _p4 = Expect<Equals<Eval<"2*3+4*5">, 26>>;
type _p5 = Expect<Equals<Eval<"1+2*3+4">, 11>>;

// @ts-expect-error — precedence must not be left-to-right: "2+3*4" is 14, not 20.
type _p6 = Expect<Equals<Eval<"2+3*4">, 20>>;

/* -------------------------------------------------------------------------- */
/* Associativity: all operators fold left                                     */
/* -------------------------------------------------------------------------- */

type _a1 = Expect<Equals<Eval<"10-2-3">, 5>>;
type _a2 = Expect<Equals<Eval<"20-5-4-3">, 8>>;
type _a3 = Expect<Equals<Eval<"2*3*4">, 24>>;
type _a4 = Expect<Equals<Eval<"1+2+3+4+5">, 15>>;
type _a5 = Expect<Equals<Eval<"10-(2-1)">, 9>>;

// @ts-expect-error — right-associative subtraction would give 11, not 5.
type _a6 = Expect<Equals<Eval<"10-2-3">, 11>>;

/* -------------------------------------------------------------------------- */
/* Parentheses and nesting                                                    */
/* -------------------------------------------------------------------------- */

type _b1 = Expect<Equals<Eval<"(7)">, 7>>;
type _b2 = Expect<Equals<Eval<"((((5))))">, 5>>;
type _b3 = Expect<Equals<Eval<"(2+3)*(4+1)">, 25>>;
type _b4 = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;
type _b5 = Expect<Equals<Eval<"2*(3+(4*(1+1)))">, 22>>;
type _b6 = Expect<Equals<Eval<"((2+3)*4)-(5*2)">, 10>>;
type _b7 = Expect<Equals<Eval<"(((1+1)*(1+1))*((1+1)*(1+1)))">, 16>>;

/* -------------------------------------------------------------------------- */
/* Whitespace is insignificant                                                */
/* -------------------------------------------------------------------------- */

type _w1 = Expect<Equals<Eval<"  2 + 3 * 4  ">, 14>>;
type _w2 = Expect<Equals<Eval<"( 2 + 3 ) * 4">, 20>>;
type _w3 = Expect<Equals<Eval<"1 2">, 12>>; // digits rejoin once spaces are stripped
type _w4 = Expect<Equals<Eval<"10\t-\n2 -\r3">, 5>>;
type _w5 = Expect<Equals<Eval<"   7   ">, 7>>;

/* -------------------------------------------------------------------------- */
/* Larger / deeper expressions                                                */
/* -------------------------------------------------------------------------- */

type _l1 = Expect<Equals<Eval<"12*20">, 240>>;
type _l2 = Expect<Equals<Eval<"100+100+50">, 250>>;
type _l3 = Expect<Equals<Eval<"(10+10)*(10+2)">, 240>>;
type _l4 = Expect<Equals<Eval<"1+1+1+1+1+1+1+1+1+1+1+1+1+1+1+1">, 16>>;
type _l5 = Expect<Equals<Eval<"(1+(2+(3+(4+(5+(6+(7+8)))))))">, 36>>;
type _l6 = Expect<Equals<Eval<"2*3*4*5">, 120>>;
type _l7 = Expect<Equals<Eval<"255-5">, 250>>;

/* -------------------------------------------------------------------------- */
/* Zero and identity edge cases                                               */
/* -------------------------------------------------------------------------- */

type _z1 = Expect<Equals<Eval<"0+0">, 0>>;
type _z2 = Expect<Equals<Eval<"0*99">, 0>>;
type _z3 = Expect<Equals<Eval<"99*0">, 0>>;
type _z4 = Expect<Equals<Eval<"5-5">, 0>>;
type _z5 = Expect<Equals<Eval<"1*1*1*1">, 1>>;
type _z6 = Expect<Equals<Eval<"(0)">, 0>>;

/* -------------------------------------------------------------------------- */
/* Malformed input resolves to never, never to a wrong number                 */
/* -------------------------------------------------------------------------- */

type _m1 = Expect<Equals<Eval<"">, never>>;
type _m2 = Expect<Equals<Eval<"(1+2">, never>>;
type _m3 = Expect<Equals<Eval<"1+2)">, never>>;
type _m4 = Expect<Equals<Eval<"1+">, never>>;
type _m5 = Expect<Equals<Eval<"+1">, never>>;
type _m6 = Expect<Equals<Eval<"1+*2">, never>>;
type _m7 = Expect<Equals<Eval<"1$2">, never>>;
type _m8 = Expect<Equals<Eval<"()">, never>>;

// @ts-expect-error — a malformed expression must not evaluate to a number.
type _m9 = Expect<Equals<Eval<"1+2)">, 3>>;

/* -------------------------------------------------------------------------- */

export type CompileTimeOnly = [
  _n1,
  _n2,
  _n3,
  _n4,
  _n5,
  _e1,
  _e2,
  _e3,
  _e4,
  _p1,
  _p2,
  _p3,
  _p4,
  _p5,
  _a1,
  _a2,
  _a3,
  _a4,
  _a5,
  _b1,
  _b2,
  _b3,
  _b4,
  _b5,
  _b6,
  _b7,
  _w1,
  _w2,
  _w3,
  _w4,
  _w5,
  _l1,
  _l2,
  _l3,
  _l4,
  _l5,
  _l6,
  _l7,
  _z1,
  _z2,
  _z3,
  _z4,
  _z5,
  _z6,
  _m1,
  _m2,
  _m3,
  _m4,
  _m5,
  _m6,
  _m7,
  _m8,
];
