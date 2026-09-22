/**
 * A type-level arithmetic evaluator.
 *
 *   type A = Eval<"2+3*4">;         // 14
 *   type B = Eval<"(2+3)*4">;       // 20
 *   type C = Eval<"10-2-3">;        // 5
 *   type D = Eval<"((1+2)*(3+4))">; // 21
 *
 * Grammar (whitespace insignificant, all operators left-associative):
 *
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *   number = digit+
 *
 * Three layers, kept strictly separate:
 *
 *   1. Arithmetic — natural numbers are represented as tuple *lengths*, which
 *      is the only way to add and multiply in the type system.
 *   2. Lexer      — string -> token list, numbers already reduced to tuples.
 *   3. Parser     — recursive descent over the token list, one function per
 *      grammar rule, each returning [value, remaining tokens].
 *
 * Every loop (lexing, the `+`/`-` chain, the `*` chain, counting) is written in
 * tail position so TypeScript's tail-recursion elimination applies and depth is
 * not a practical limit for sensible expressions.
 */

/* -------------------------------------------------------------------------- */
/* 1. Arithmetic on natural numbers, represented as tuple length               */
/* -------------------------------------------------------------------------- */

/** A natural number: its value is the tuple's length. */
type Nat = unknown[];

/** a + b */
type Add<A extends Nat, B extends Nat> = [...A, ...B];

/** a - b, and `never` when it would go negative (outside the grammar). */
type Sub<A extends Nat, B extends Nat> = A extends [...B, ...infer Rest] ? Rest : never;

/** a * b, by repeated addition — tail-recursive, one step per unit of `b`. */
type Mul<A extends Nat, B extends Nat, Acc extends Nat = []> = B extends [unknown, ...infer Rest]
  ? Mul<A, Rest, [...Acc, ...A]>
  : Acc;

/** n * 10, spelled out so that reading digits costs no recursion. */
type Times10<N extends Nat> = [...N, ...N, ...N, ...N, ...N, ...N, ...N, ...N, ...N, ...N];

/* -------------------------------------------------------------------------- */
/* 2. Lexer                                                                   */
/* -------------------------------------------------------------------------- */

/** Each decimal digit as the natural number it denotes. */
interface DigitValue {
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
}

type Digit = keyof DigitValue;
type Operator = "+" | "-" | "*";
type Paren = "(" | ")";
type Whitespace = " " | "\t" | "\n" | "\r";

/** A token is either a literal number (as a tuple) or a single symbol. */
type Token = Nat | Operator | Paren;
type Tokens = Token[];

/**
 * Turn the source string into a token list. Digits are folded into a number
 * token as they are read, so the parser never sees characters.
 */
type Lex<S extends string, Out extends Tokens = []> = S extends `${infer Head}${infer Rest}`
  ? Head extends Whitespace
    ? Lex<Rest, Out>
    : Head extends Digit
      ? LexNumber<Rest, DigitValue[Head], Out>
      : Head extends Operator | Paren
        ? Lex<Rest, [...Out, Head]>
        : never // unexpected character
  : Out;

/** Continue a number literal: value = value * 10 + digit. */
type LexNumber<
  S extends string,
  Value extends Nat,
  Out extends Tokens,
> = S extends `${infer Head}${infer Rest}`
  ? Head extends Digit
    ? LexNumber<Rest, Add<Times10<Value>, DigitValue[Head]>, Out>
    : Lex<S, [...Out, Value]>
  : [...Out, Value];

/* -------------------------------------------------------------------------- */
/* 3. Parser (recursive descent)                                              */
/* -------------------------------------------------------------------------- */

/** What every rule returns: the value it parsed, and what is left over. */
type Parsed<Value extends Nat, Rest extends Tokens> = [value: Value, rest: Rest];

/** factor = number | "(" expr ")" */
type ParseFactor<T extends Tokens> = T extends [infer Head, ...infer Rest extends Tokens]
  ? Head extends Nat
    ? Parsed<Head, Rest>
    : Head extends "("
      ? ParseExpr<Rest> extends Parsed<infer Value, infer AfterExpr>
        ? AfterExpr extends [")", ...infer AfterParen extends Tokens]
          ? Parsed<Value, AfterParen>
          : never // unbalanced parenthesis
        : never
      : never // an operator where an operand was expected
  : never; // ran out of tokens

/** term = factor ("*" factor)*, left-associative. */
type ParseTerm<T extends Tokens> = ParseFactor<T> extends Parsed<infer Value, infer Rest>
  ? ParseTermTail<Value, Rest>
  : never;

type ParseTermTail<Acc extends Nat, T extends Tokens> = T extends [
  "*",
  ...infer Rest extends Tokens,
]
  ? ParseFactor<Rest> extends Parsed<infer Value, infer After>
    ? ParseTermTail<Mul<Acc, Value>, After>
    : never
  : Parsed<Acc, T>;

/** expr = term (("+" | "-") term)*, left-associative. */
type ParseExpr<T extends Tokens> = ParseTerm<T> extends Parsed<infer Value, infer Rest>
  ? ParseExprTail<Value, Rest>
  : never;

type ParseExprTail<Acc extends Nat, T extends Tokens> = T extends [
  "+",
  ...infer Rest extends Tokens,
]
  ? ParseTerm<Rest> extends Parsed<infer Value, infer After>
    ? ParseExprTail<Add<Acc, Value>, After>
    : never
  : T extends ["-", ...infer Rest extends Tokens]
    ? ParseTerm<Rest> extends Parsed<infer Value, infer After>
      ? ParseExprTail<Sub<Acc, Value>, After>
      : never
    : Parsed<Acc, T>;

/* -------------------------------------------------------------------------- */
/* 4. Entry point                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Evaluate an arithmetic expression given as a string literal type.
 * Malformed input (unbalanced parentheses, stray characters, trailing
 * operators) resolves to `never`.
 */
export type Eval<S extends string> = ParseExpr<Lex<S>> extends Parsed<infer Value, infer Rest>
  ? Rest extends []
    ? Value["length"]
    : never // trailing tokens: the whole input was not consumed
  : never;
