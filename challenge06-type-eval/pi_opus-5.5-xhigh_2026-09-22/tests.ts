/**
 * Compile-time tests for `Eval`. The type-check is the test run:
 *   npx tsgo --noEmit --strict --target ES2024 --module NodeNext --moduleResolution NodeNext solution.ts tests.ts
 */
import type { Add, Eval, Lex, Multiply, Subtract, ToPostfix } from "./solution.js";

type Equal<X, Y> = (<G>() => G extends X ? 1 : 2) extends <G>() => G extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Builders for large inputs, so the tests can go far beyond what is pleasant to type by hand.
type Repeat<N extends number, Count extends 1[] = []> = Count["length"] extends N ? Count : Repeat<N, [...Count, 1]>;
/** `Nest<"x", 3>` is "(((x)))". */
type Nest<S extends string, N extends number, Count extends 1[] = []> =
  Count["length"] extends N ? S : Nest<`(${S})`, N, [...Count, 1]>;
/** `Chain<"1", "+", 3>` is "1+1+1". */
type Chain<Operand extends string, Op extends string, N extends number, S extends string = Operand, Count extends 1[] = [1]> =
  Count["length"] extends N ? S : Chain<Operand, Op, N, `${S}${Op}${Operand}`, [...Count, 1]>;
/** `LeftNested<3>` is "(((1+1)+1)+1)": every level adds one more group around the previous one. */
type LeftNested<N extends number, S extends string = "1", Count extends 1[] = []> =
  Count["length"] extends N ? S : LeftNested<N, `(${S}+1)`, [...Count, 1]>;

// ---------------------------------------------------------------------------
// The examples from the README
// ---------------------------------------------------------------------------

export type ReadmeExamples = [
  Expect<Equal<Eval<"2+3*4">, 14>>,
  Expect<Equal<Eval<"(2+3)*4">, 20>>,
  Expect<Equal<Eval<"10-2-3">, 5>>,
  Expect<Equal<Eval<"((1+2)*(3+4))">, 21>>,
];

// ---------------------------------------------------------------------------
// Precedence: * binds tighter than + and -
// ---------------------------------------------------------------------------

export type PrecedenceTests = [
  Expect<Equal<Eval<"2*3+4">, 10>>,
  Expect<Equal<Eval<"2+3*4+5">, 19>>,
  Expect<Equal<Eval<"20-3*4">, 8>>,
  Expect<Equal<Eval<"2*3-4*1">, 2>>,
  Expect<Equal<Eval<"1+2*3*4-5">, 20>>,
  Expect<Equal<Eval<"9-2*2*2+1">, 2>>,
];

// ---------------------------------------------------------------------------
// Associativity: all operators are left-associative
// ---------------------------------------------------------------------------

export type AssociativityTests = [
  Expect<Equal<Eval<"10-2-3">, 5>>, // (10-2)-3, not 10-(2-3)
  Expect<Equal<Eval<"20-5+3">, 18>>, // (20-5)+3, not 20-(5+3)
  Expect<Equal<Eval<"100-50-25-5">, 20>>,
  Expect<Equal<Eval<"8-4+2-1">, 5>>,
  Expect<Equal<Eval<"2*3*4">, 24>>,
  Expect<Equal<Eval<"1-1+1">, 1>>, // right association would compute 1-(1+1), which is negative
];

// ---------------------------------------------------------------------------
// Parentheses
// ---------------------------------------------------------------------------

export type ParenthesesTests = [
  Expect<Equal<Eval<"(7)">, 7>>,
  Expect<Equal<Eval<"10-(2-1)">, 9>>,
  Expect<Equal<Eval<"10-(2+3)">, 5>>,
  Expect<Equal<Eval<"(1+2)*(3+4)*(5-3)">, 42>>,
  Expect<Equal<Eval<"2*(3+4)*5-6">, 64>>,
  Expect<Equal<Eval<"(2*(3+(4*(5-1))))">, 38>>,
];

// ---------------------------------------------------------------------------
// Whitespace is insignificant between tokens (spaces, tabs, newlines)
// ---------------------------------------------------------------------------

export type WhitespaceTests = [
  Expect<Equal<Eval<" 2 + 3 * 4 ">, 14>>,
  Expect<Equal<Eval<"(  2+3 )*\t4">, 20>>,
  Expect<Equal<Eval<"\n10\n-\n2\n-\n3\n">, 5>>,
  Expect<Equal<Eval<"\r\n ( ( 1 + 2 ) * ( 3 + 4 ) ) \t">, 21>>,
  Expect<Equal<Eval<"   42   ">, 42>>,
];

// ---------------------------------------------------------------------------
// Nesting, including very deep nesting and long chains
// ---------------------------------------------------------------------------

export type NestingTests = [
  Expect<Equal<Nest<"x", 3>, "(((x)))">>, // the builders themselves
  Expect<Equal<Chain<"1", "+", 3>, "1+1+1">>,
  Expect<Equal<LeftNested<2>, "((1+1)+1)">>,
  Expect<Equal<Eval<"((((((((((5))))))))))">, 5>>,
  Expect<Equal<Eval<"(((1+2)*3)-(4-(5-(6-3))))*2">, 14>>,
  Expect<Equal<Eval<Nest<"1+1", 50>>, 2>>,
  Expect<Equal<Eval<Nest<"2*3", 150>>, 6>>,
  Expect<Equal<Eval<LeftNested<100>>, 101>>,
  Expect<Equal<Eval<Chain<"1", "+", 200>>, 200>>,
  Expect<Equal<Eval<Chain<"2", "*", 20>>, 1048576>>,
  Expect<Equal<Eval<`${Chain<"1", "+", 150>}-${Nest<Chain<"1", "+", 50>, 20>}`>, 100>>,
];

// ---------------------------------------------------------------------------
// Numbers: multi-digit, zero, leading zeros, large results
// ---------------------------------------------------------------------------

export type NumberTests = [
  Expect<Equal<Eval<"0">, 0>>,
  Expect<Equal<Eval<"123">, 123>>,
  Expect<Equal<Eval<"007+3">, 10>>, // digit+ allows leading zeros
  Expect<Equal<Eval<"0*123">, 0>>,
  Expect<Equal<Eval<"5-5">, 0>>,
  Expect<Equal<Eval<"100-99">, 1>>,
  Expect<Equal<Eval<"1000-1">, 999>>,
  Expect<Equal<Eval<"12*34">, 408>>,
  Expect<Equal<Eval<"999*999">, 998001>>,
  Expect<Equal<Eval<"99999+1">, 100000>>,
  Expect<Equal<Eval<"12345678*87654321">, 1082152022374638>>,
];

// ---------------------------------------------------------------------------
// The stages in isolation: lexing, parsing (to postfix) and arithmetic
// ---------------------------------------------------------------------------

export type StageTests = [
  Expect<Equal<Lex<" 12 + (3*45)">, ["12", "+", "(", "3", "*", "45", ")"]>>,
  Expect<Equal<ToPostfix<Lex<"2+3*4">>, ["2", "3", "4", "*", "+"]>>,
  Expect<Equal<ToPostfix<Lex<"10-2-3">>, ["10", "2", "-", "3", "-"]>>,
  Expect<Equal<ToPostfix<Lex<"(2+3)*4">>, ["2", "3", "+", "4", "*"]>>,
  Expect<Equal<Add<[9, 9], [1]>, [0, 0, 1]>>, // 99 + 1 = 100 (digits are little-endian)
  Expect<Equal<Subtract<[0, 0, 1], [1]>, [9, 9]>>, // 100 - 1 = 99
  Expect<Equal<Subtract<[5], [5]>, []>>, // zero is the empty digit list
  Expect<Equal<Subtract<[1], [2]>, never>>, // negative
  Expect<Equal<Multiply<[2, 1], [4, 3]>, [8, 0, 4]>>, // 12 * 34 = 408
  Expect<Equal<Repeat<3>, [1, 1, 1]>>,
];

// ---------------------------------------------------------------------------
// Anything outside the grammar evaluates to `never`
// ---------------------------------------------------------------------------

export type InvalidInputTests = [
  Expect<Equal<Eval<"">, never>>,
  Expect<Equal<Eval<"   ">, never>>,
  Expect<Equal<Eval<"2+">, never>>,
  Expect<Equal<Eval<"+2">, never>>,
  Expect<Equal<Eval<"2**3">, never>>,
  Expect<Equal<Eval<"2 3">, never>>, // two numbers in a row
  Expect<Equal<Eval<"(2">, never>>,
  Expect<Equal<Eval<"2)">, never>>,
  Expect<Equal<Eval<"()">, never>>,
  Expect<Equal<Eval<"(1)(2)">, never>>,
  Expect<Equal<Eval<"2/1">, never>>, // no division in the grammar
  Expect<Equal<Eval<"-1">, never>>, // no unary minus
  Expect<Equal<Eval<"1.5">, never>>,
  Expect<Equal<Eval<"x+1">, never>>,
  Expect<Equal<Eval<"1-2">, never>>, // negative results are outside the contract
];

// ---------------------------------------------------------------------------
// Unions distribute
// ---------------------------------------------------------------------------

export type UnionTests = [Expect<Equal<Eval<"1+1" | "2*3">, 2 | 6>>];
