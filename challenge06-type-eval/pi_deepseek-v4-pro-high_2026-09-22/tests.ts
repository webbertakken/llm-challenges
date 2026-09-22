/**
 * Compile-time tests for `Eval`.
 *
 * Run with: npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts tests.ts
 */
import type { Eval } from "./solution.js";

type Expect<T extends true> = T;
type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? true
  : false;

// Precedence: * binds tighter than + and -
type _precedence_mul_over_add = Expect<Equal<Eval<"2+3*4">, 14>>;
type _precedence_mul_over_sub = Expect<Equal<Eval<"10-2*3">, 4>>;

// Parentheses
type _paren_basic = Expect<Equal<Eval<"(2+3)*4">, 20>>;
type _paren_nested = Expect<Equal<Eval<"((1+2)*(3+4))">, 21>>;
type _paren_unneeded = Expect<Equal<Eval<"(42)">, 42>>;

// Left associativity
type _assoc_sub = Expect<Equal<Eval<"10-2-3">, 5>>;
type _assoc_add = Expect<Equal<Eval<"1+2+3+4">, 10>>;
type _assoc_mul = Expect<Equal<Eval<"2*3*4">, 24>>;

// Whitespace is insignificant
type _ws_spaces = Expect<Equal<Eval<"  2 + 3 * 4 ">, 14>>;
type _ws_tabs_newlines = Expect<Equal<Eval<"  ( 1 + 2 ) *\t( 3 + 4 )\n">, 21>>;
type _ws_none = Expect<Equal<Eval<"2+3*4">, 14>>;

// Multi-digit numbers
type _multi_digit = Expect<Equal<Eval<"100+23">, 123>>;
type _multi_digit2 = Expect<Equal<Eval<"12*12">, 144>>;
type _multi_digit3 = Expect<Equal<Eval<"999-998">, 1>>;

// Single number
type _single = Expect<Equal<Eval<"42">, 42>>;
type _zero = Expect<Equal<Eval<"0">, 0>>;

// Zero and edge arithmetic
type _zero_add = Expect<Equal<Eval<"0+0">, 0>>;
type _mul_zero = Expect<Equal<Eval<"5*0">, 0>>;
type _sub_zero = Expect<Equal<Eval<"5-0">, 5>>;
type _mul_one = Expect<Equal<Eval<"5*1">, 5>>;

// Mixed longer expression
type _mixed = Expect<Equal<Eval<"1+2*3+4*5+6">, 33>>;
type _mixed2 = Expect<Equal<Eval<"(1+2)*(3+4)+(5-2)*6">, 39>>;

export {};
