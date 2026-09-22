/**
 * Type-level Arithmetic Expression Evaluator
 *
 * Implements a recursive descent parser and evaluator entirely in TypeScript's type system:
 * - Tokenizer: Converts string literals into token streams (numbers, operators, parens)
 * - Natural Number Arithmetic: Tuple-length operations for +, -, *
 * - Parser / Evaluator:
 *     expr   = term (("+" | "-") term)*
 *     term   = factor ("*" factor)*
 *     factor = number | "(" expr ")"
 */

type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';
type Whitespace = ' ' | '\t' | '\n' | '\r';

// Lexer: tokenizes expression into numbers, operators, and parentheses
type Tokenize<S extends string, Acc extends unknown[] = [], CurNum extends string = ''> =
  S extends `${infer C}${infer Rest}`
    ? C extends Whitespace
      ? CurNum extends ''
        ? Tokenize<Rest, Acc, ''>
        : Tokenize<Rest, [...Acc, CurNum extends `${infer N extends number}` ? N : never], ''>
      : C extends Digit
        ? Tokenize<Rest, Acc, `${CurNum}${C}`>
        : C extends '+' | '-' | '*' | '(' | ')'
          ? CurNum extends ''
            ? Tokenize<Rest, [...Acc, C], ''>
            : Tokenize<Rest, [...Acc, CurNum extends `${infer N extends number}` ? N : never, C], ''>
          : Tokenize<Rest, Acc, CurNum>
    : CurNum extends ''
      ? Acc
      : [...Acc, CurNum extends `${infer N extends number}` ? N : never];

// Natural number tuple builder
type BuildTuple<L extends number, T extends unknown[] = []> =
  T['length'] extends L ? T : BuildTuple<L, [...T, unknown]>;

// Type-level arithmetic
type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]['length'] extends infer R extends number ? R : never;

type Sub<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer R]
    ? R['length'] extends infer Len extends number ? Len : 0
    : 0;

type MulLoop<A extends unknown[], B extends unknown[], Acc extends unknown[] = []> =
  B extends [unknown, ...infer Rest]
    ? MulLoop<A, Rest, [...Acc, ...A]>
    : Acc['length'] extends infer R extends number ? R : never;

type Mul<A extends number, B extends number> =
  MulLoop<BuildTuple<A>, BuildTuple<B>> extends infer R extends number ? R : never;

// Recursive descent parser
type ParseFactor<Tokens extends unknown[]> =
  Tokens extends [infer N extends number, ...infer Rest extends unknown[]]
    ? [N, Rest]
    : Tokens extends ['(', ...infer Rest extends unknown[]]
      ? ParseExpr<Rest> extends [infer Val extends number, infer AfterExpr extends unknown[]]
        ? AfterExpr extends [')', ...infer AfterParen extends unknown[]]
          ? [Val, AfterParen]
          : never
        : never
      : never;

type ParseTermRest<AccVal extends number, Tokens extends unknown[]> =
  Tokens extends ['*', ...infer Rest extends unknown[]]
    ? ParseFactor<Rest> extends [infer NextVal extends number, infer AfterFactor extends unknown[]]
      ? ParseTermRest<Mul<AccVal, NextVal>, AfterFactor>
      : never
    : [AccVal, Tokens];

type ParseTerm<Tokens extends unknown[]> =
  ParseFactor<Tokens> extends [infer Val extends number, infer Rest extends unknown[]]
    ? ParseTermRest<Val, Rest>
    : never;

type ParseExprRest<AccVal extends number, Tokens extends unknown[]> =
  Tokens extends ['+', ...infer Rest extends unknown[]]
    ? ParseTerm<Rest> extends [infer NextVal extends number, infer AfterTerm extends unknown[]]
      ? ParseExprRest<Add<AccVal, NextVal>, AfterTerm>
      : never
    : Tokens extends ['-', ...infer Rest extends unknown[]]
      ? ParseTerm<Rest> extends [infer NextVal extends number, infer AfterTerm extends unknown[]]
        ? ParseExprRest<Sub<AccVal, NextVal>, AfterTerm>
        : never
      : [AccVal, Tokens];

type ParseExpr<Tokens extends unknown[]> =
  ParseTerm<Tokens> extends [infer Val extends number, infer Rest extends unknown[]]
    ? ParseExprRest<Val, Rest>
    : never;

/**
 * Evaluates an arithmetic expression string literal type to its numeric result.
 */
export type Eval<S extends string> =
  ParseExpr<Tokenize<S>> extends [infer Res extends number, unknown[]]
    ? Res
    : never;
