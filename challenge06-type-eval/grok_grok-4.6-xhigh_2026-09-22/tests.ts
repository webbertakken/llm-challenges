import type { Eval } from "./solution.ts";

type Equal<X, Y> =
  (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;

type Expect<T extends true> = T;

type _add_mul_precedence = Expect<Equal<Eval<"2+3*4">, 14>>;
type _parens = Expect<Equal<Eval<"(2+3)*4">, 20>>;
type _left_assoc_sub = Expect<Equal<Eval<"10-2-3">, 5>>;
type _nested = Expect<Equal<Eval<"((1+2)*(3+4))">, 21>>;

type _ws_spaces = Expect<Equal<Eval<" 2 + 3 * 4 ">, 14>>;
type _ws_tabs = Expect<Equal<Eval<"\t( 2 + 3 )\t*\t4">, 20>>;
type _ws_newlines = Expect<Equal<Eval<"(\n1+2\n)*(3+4)">, 21>>;

type _multi_digit = Expect<Equal<Eval<"12+30*2">, 72>>;
type _multi_digit_sub = Expect<Equal<Eval<"100-40-10">, 50>>;
type _leading_zeros = Expect<Equal<Eval<"001+002">, 3>>;

type _only_number = Expect<Equal<Eval<"42">, 42>>;
type _zero = Expect<Equal<Eval<"0">, 0>>;
type _zero_plus = Expect<Equal<Eval<"0+0">, 0>>;
type _zero_mul = Expect<Equal<Eval<"7*0">, 0>>;
type _paren_number = Expect<Equal<Eval<"(7)">, 7>>;
type _double_paren = Expect<Equal<Eval<"((7))">, 7>>;

type _left_assoc_add = Expect<Equal<Eval<"1+2+3+4">, 10>>;
type _left_assoc_mul = Expect<Equal<Eval<"2*3*4">, 24>>;
type _mixed = Expect<Equal<Eval<"1+2*3+4">, 11>>;
type _mixed_sub = Expect<Equal<Eval<"20-2*3-4">, 10>>;
type _paren_inside = Expect<Equal<Eval<"2*(3+4*5)">, 46>>;
type _deep = Expect<Equal<Eval<"((((1+2)+3)+4)*2)">, 20>>;
type _chain_paren = Expect<Equal<Eval<"(1+(2+(3+4)))">, 10>>;

type _times_one = Expect<Equal<Eval<"99*1">, 99>>;
type _add_zero = Expect<Equal<Eval<"99+0">, 99>>;
type _sub_zero = Expect<Equal<Eval<"99-0">, 99>>;
type _bigger = Expect<Equal<Eval<"15*15">, 225>>;
type _expr_with_many_ops = Expect<Equal<Eval<"1*2+3*4+5*6">, 44>>;
