/**
 * Compile-time assertions for the type-level evaluator.
 *
 * Every `Expect<...>` line type-checks only when the corresponding `Eval`
 * result exactly matches the expected numeric literal. If any assertion is
 * wrong, `tsgo --noEmit` reports an error on that line.
 */

import type { Eval } from "./solution.js";

// --- Tiny assertion harness ------------------------------------------------

/** Strict, invariant type equality. */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type Expect<T extends true> = T;

// --- Examples from the brief ----------------------------------------------

type _readme1 = Expect<Equals<Eval<"2+3*4">, 14>>; // precedence: * before +
type _readme2 = Expect<Equals<Eval<"(2+3)*4">, 20>>; // parentheses
type _readme3 = Expect<Equals<Eval<"10-2-3">, 5>>; // left-associative
type _readme4 = Expect<Equals<Eval<"((1+2)*(3+4))">, 21>>; // nesting

// --- Single operands -------------------------------------------------------

type _single1 = Expect<Equals<Eval<"0">, 0>>;
type _single2 = Expect<Equals<Eval<"7">, 7>>;
type _single3 = Expect<Equals<Eval<"42">, 42>>; // multi-digit
type _single4 = Expect<Equals<Eval<"123">, 123>>; // three digits

// --- Precedence ------------------------------------------------------------

type _prec1 = Expect<Equals<Eval<"2*3+4">, 10>>;
type _prec2 = Expect<Equals<Eval<"4+2*3">, 10>>;
type _prec3 = Expect<Equals<Eval<"2*3+4*5">, 26>>;
type _prec4 = Expect<Equals<Eval<"1+2*3+4">, 11>>;

// --- Associativity ---------------------------------------------------------

type _assoc1 = Expect<Equals<Eval<"20-5-5-5">, 5>>; // left-assoc subtraction
type _assoc2 = Expect<Equals<Eval<"2*3*4">, 24>>; // left-assoc multiplication
type _assoc3 = Expect<Equals<Eval<"1+2+3+4">, 10>>; // chained addition
type _assoc4 = Expect<Equals<Eval<"10-3+2">, 9>>; // mixed +/- left-to-right

// --- Parentheses & nesting -------------------------------------------------

type _paren1 = Expect<Equals<Eval<"(2+3)*4">, 20>>;
type _paren2 = Expect<Equals<Eval<"2*(3+4)">, 14>>;
type _paren3 = Expect<Equals<Eval<"2*(3+(4*5))">, 46>>; // 2*(3+20)
type _paren4 = Expect<Equals<Eval<"((2+3))">, 5>>; // redundant nesting
type _paren5 = Expect<Equals<Eval<"(1+2)*(3+4)-5">, 16>>; // 3*7-5

// --- Whitespace ------------------------------------------------------------

type _ws1 = Expect<Equals<Eval<" 2 + 3 ">, 5>>; // surrounding + inner spaces
type _ws2 = Expect<Equals<Eval<"  12  *  3 ">, 36>>;
type _ws3 = Expect<Equals<Eval<"10 - 2 - 3">, 5>>;
type _ws4 = Expect<Equals<Eval<" ( 2 + 3 ) * 4 ">, 20>>;

// --- Larger / combined -----------------------------------------------------

type _big1 = Expect<Equals<Eval<"100+23">, 123>>;
type _big2 = Expect<Equals<Eval<"12*10-15">, 105>>;
type _big3 = Expect<Equals<Eval<"(10+2)*(5+3)">, 96>>;
type _big4 = Expect<Equals<Eval<"50-10*3">, 20>>; // precedence with big-ish values
