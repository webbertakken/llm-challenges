/**
 * Challenge 06 — Type-level arithmetic expression evaluator
 */

// --- Arithmetic using Tuple Lengths ---

type DigitTupleMap = {
  "0": [];
  "1": [unknown];
  "2": [unknown, unknown];
  "3": [unknown, unknown, unknown];
  "4": [unknown, unknown, unknown, unknown];
  "5": [unknown, unknown, unknown, unknown, unknown];
  "6": [unknown, unknown, unknown, unknown, unknown, unknown];
  "7": [unknown, unknown, unknown, unknown, unknown, unknown, unknown];
  "8": [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown];
  "9": [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown];
};

type MultiplyBy10<T extends unknown[]> = [
  ...T, ...T, ...T, ...T, ...T,
  ...T, ...T, ...T, ...T, ...T,
];

type StringToTuple<S extends string, Acc extends unknown[] = []> =
  S extends `${infer D extends keyof DigitTupleMap}${infer Rest}`
    ? StringToTuple<Rest, [...MultiplyBy10<Acc>, ...DigitTupleMap[D]]>
    : Acc;

type NumToTuple<N extends number> = StringToTuple<`${N}`>;

type AddTuples<A extends unknown[], B extends unknown[]> = [...A, ...B];

type SubTuples<A extends unknown[], B extends unknown[]> =
  A extends [...B, ...infer Rest] ? Rest : [];

type MulTuples<A extends unknown[], B extends unknown[], Acc extends unknown[] = []> =
  B extends [unknown, ...infer RestB]
    ? MulTuples<A, RestB, [...Acc, ...A]>
    : Acc;

type Add<A extends number, B extends number> =
  AddTuples<NumToTuple<A>, NumToTuple<B>>["length"] & number;

type Sub<A extends number, B extends number> =
  SubTuples<NumToTuple<A>, NumToTuple<B>>["length"] & number;

type Mul<A extends number, B extends number> =
  MulTuples<NumToTuple<A>, NumToTuple<B>>["length"] & number;

// --- Tokenizer ---

type Whitespace = " " | "\t" | "\n" | "\r";
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type Token =
  | { type: "num"; value: number }
  | { type: "+" }
  | { type: "-" }
  | { type: "*" }
  | { type: "(" }
  | { type: ")" };

type TokenizeNumber<S extends string, NumStr extends string, Acc extends Token[]> =
  S extends `${infer D extends Digit}${infer Rest}`
    ? TokenizeNumber<Rest, `${NumStr}${D}`, Acc>
    : Tokenize<S, [...Acc, { type: "num"; value: StringToTuple<NumStr>["length"] & number }]>;

type Tokenize<S extends string, Acc extends Token[] = []> =
  S extends `${Whitespace}${infer Rest}`
    ? Tokenize<Rest, Acc>
    : S extends `${infer D extends Digit}${infer Rest}`
    ? TokenizeNumber<Rest, D, Acc>
    : S extends `+${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: "+" }]>
    : S extends `-${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: "-" }]>
    : S extends `*${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: "*" }]>
    : S extends `(${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: "(" }]>
    : S extends `)${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: ")" }]>
    : S extends ""
    ? Acc
    : never;

// --- Recursive Descent Parser & Evaluator ---

type ParseFactor<Tokens extends Token[]> =
  Tokens extends [{ type: "num"; value: infer V extends number }, ...infer RestTokens extends Token[]]
    ? [V, RestTokens]
    : Tokens extends [{ type: "(" }, ...infer RestTokens extends Token[]]
    ? ParseExpr<RestTokens> extends [infer Val extends number, [{ type: ")" }, ...infer AfterParen extends Token[]]]
      ? [Val, AfterParen]
      : never
    : never;

type ParseTermLoop<Val extends number, Tokens extends Token[]> =
  Tokens extends [{ type: "*" }, ...infer RestTokens extends Token[]]
    ? ParseFactor<RestTokens> extends [infer NextVal extends number, infer AfterFactor extends Token[]]
      ? ParseTermLoop<Mul<Val, NextVal>, AfterFactor>
      : never
    : [Val, Tokens];

type ParseTerm<Tokens extends Token[]> =
  ParseFactor<Tokens> extends [infer Val extends number, infer RestTokens extends Token[]]
    ? ParseTermLoop<Val, RestTokens>
    : never;

type ParseExprLoop<Val extends number, Tokens extends Token[]> =
  Tokens extends [{ type: "+" }, ...infer RestTokens extends Token[]]
    ? ParseTerm<RestTokens> extends [infer NextVal extends number, infer AfterTerm extends Token[]]
      ? ParseExprLoop<Add<Val, NextVal>, AfterTerm>
      : never
    : Tokens extends [{ type: "-" }, ...infer RestTokens extends Token[]]
    ? ParseTerm<RestTokens> extends [infer NextVal extends number, infer AfterTerm extends Token[]]
      ? ParseExprLoop<Sub<Val, NextVal>, AfterTerm>
      : never
    : [Val, Tokens];

type ParseExpr<Tokens extends Token[]> =
  ParseTerm<Tokens> extends [infer Val extends number, infer RestTokens extends Token[]]
    ? ParseExprLoop<Val, RestTokens>
    : never;

/**
 * Type-level arithmetic expression evaluator.
 * Evaluates an arithmetic string literal to its numeric literal result.
 */
export type Eval<S extends string> =
  ParseExpr<Tokenize<S>> extends [infer Result extends number, []]
    ? Result
    : never;
