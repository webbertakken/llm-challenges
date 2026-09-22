import type { Eval } from "./solution.ts";

type Expect<T extends true> = T;
type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;

type _add_mul_precedence = Expect<Equal<Eval<"2+3*4">, 14>>;
type _paren_override = Expect<Equal<Eval<"(2+3)*4">, 20>>;
type _sub_left_assoc = Expect<Equal<Eval<"10-2-3">, 5>>;
type _nested_parens = Expect<Equal<Eval<"((1+2)*(3+4))">, 21>>;

type _whitespace = Expect<Equal<Eval<" 2 + 3 * 4 ">, 14>>;
type _tabs_newlines = Expect<Equal<Eval<"\t(\n2 + 3\n)* 4">, 20>>;
type _multi_digit = Expect<Equal<Eval<"10+20*3">, 70>>;
type _multi_digit_sub = Expect<Equal<Eval<"100-40-10">, 50>>;

type _only_number = Expect<Equal<Eval<"42">, 42>>;
type _zero = Expect<Equal<Eval<"0">, 0>>;
type _zero_add = Expect<Equal<Eval<"0+5">, 5>>;
type _mul_zero = Expect<Equal<Eval<"7*0">, 0>>;
type _mul_one = Expect<Equal<Eval<"7*1">, 7>>;

type _left_add = Expect<Equal<Eval<"1+2+3+4">, 10>>;
type _left_mul = Expect<Equal<Eval<"2*3*4">, 24>>;
type _mixed = Expect<Equal<Eval<"1+2*3+4">, 11>>;
type _mixed_sub = Expect<Equal<Eval<"20-2*3-4">, 10>>;

type _deep = Expect<Equal<Eval<"((((1+2)+3)+4)*2)">, 20>>;
type _inner_ws = Expect<Equal<Eval<" ( 10 - ( 2 * 3 ) ) ">, 4>>;
type _factor_chain = Expect<Equal<Eval<"(1)*(2)*(3+4)">, 14>>;
type _paren_term = Expect<Equal<Eval<"2*(3+4*5)">, 46>>;
type _all_ops = Expect<Equal<Eval<"1+2*3-4">, 3>>;
