/**
 * Ground-truth compile-time contract for challenge 06.
 *
 * The grader copies the candidate `solution.ts` next to this file and runs
 * `tsgo --noEmit --strict`. If every assertion holds, the file compiles with
 * zero errors. A wrong `Eval` makes one or more `Expect<...>` lines error.
 */
import type { Eval } from "./solution.js";

type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;

// precedence: * before + / -
export type _1 = Expect<Equals<Eval<"2+3*4">, 14>>;
// parentheses override precedence
export type _2 = Expect<Equals<Eval<"(2+3)*4">, 20>>;
// left-associative subtraction: (10-2)-3
export type _3 = Expect<Equals<Eval<"10-2-3">, 5>>;
export type _4 = Expect<Equals<Eval<"2*3*4">, 24>>;
// whitespace is insignificant
export type _5 = Expect<Equals<Eval<"  7  +  8  ">, 15>>;
// nested parentheses
export type _6 = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>;
// bare literal
export type _7 = Expect<Equals<Eval<"100">, 100>>;
// mixed precedence: 2 + (2*2) - 1
export type _8 = Expect<Equals<Eval<"2+2*2-1">, 5>>;
export type _9 = Expect<Equals<Eval<"(8-3)*(2+1)">, 15>>;
export type _10 = Expect<Equals<Eval<"12*12">, 144>>;

// A wrong evaluator should fail here too: this must NOT equal a bogus value.
type _NegativeControl = Equals<Eval<"2+3*4">, 20>;
export type _11 = Expect<Equals<_NegativeControl, false>>;
