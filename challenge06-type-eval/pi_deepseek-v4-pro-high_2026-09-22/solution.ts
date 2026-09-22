/**
 * Type-level arithmetic expression evaluator.
 *
 * `Eval<"2+3*4">` === 14, entirely in the type system. The implementation is a
 * classic recursive-descent parser:
 *
 *   expr   = term (("+" | "-") term)*      (left-associative)
 *   term   = factor ("*" factor)*          (left-associative)
 *   factor = number | "(" expr ")"
 *   number = digit+
 *
 * Whitespace is stripped up front (it is insignificant between tokens), then
 * the token stream is consumed from the left, with natural-number arithmetic
 * done via tuple lengths. Each arithmetic result is intersected with `number`
 * so that, even with generic operands, the result is provably `number` while
 * concrete operands still reduce to the exact numeric literal.
 */

/* ------------------------------------------------------------------ *
 * Whitespace
 * ------------------------------------------------------------------ */

type Whitespace = " " | "\t" | "\n" | "\r";

/** Remove every whitespace character from `S`. */
type Strip<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Whitespace
    ? Strip<Tail>
    : `${Head}${Strip<Tail>}`
  : S;

/* ------------------------------------------------------------------ *
 * Natural-number arithmetic (tuple-length encoding)
 * ------------------------------------------------------------------ */

type NumToTuple<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : NumToTuple<N, [...Acc, unknown]>;

type Add<A extends number, B extends number> = [...NumToTuple<A>, ...NumToTuple<B>]["length"] &
  number;

type Sub<A extends number, B extends number> = (NumToTuple<A> extends [
  ...NumToTuple<B>,
  ...infer Rest,
]
  ? Rest["length"]
  : never) &
  number;

type Mul<A extends number, B extends number, Acc extends unknown[] = [], I extends unknown[] = []> = (I["length"] extends B
  ? Acc["length"]
  : Mul<A, B, [...Acc, ...NumToTuple<A>], [...I, unknown]>) &
  number;

/* ------------------------------------------------------------------ *
 * Lexing / parsing helpers
 * ------------------------------------------------------------------ */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type DigitValue<D extends string> = D extends "0"
  ? 0
  : D extends "1"
    ? 1
    : D extends "2"
      ? 2
      : D extends "3"
        ? 3
        : D extends "4"
          ? 4
          : D extends "5"
            ? 5
            : D extends "6"
              ? 6
              : D extends "7"
                ? 7
                : D extends "8"
                  ? 8
                  : D extends "9"
                    ? 9
                    : never;

/** Parse a leading non-negative integer, returning `[value, rest]`. */
type ParseInt<S extends string, Acc extends number = 0> = S extends `${infer D}${infer Rest}`
  ? D extends Digit
    ? ParseInt<Rest, Add<Mul<Acc, 10>, DigitValue<D>>>
    : [Acc, S]
  : [Acc, S];

/* ------------------------------------------------------------------ *
 * Parser: each rule returns `[value, remaining-string]`
 * ------------------------------------------------------------------ */

type ParseFactor<S extends string> = S extends `(${infer Inside}`
  ? ParseExpr<Inside> extends [infer Value extends number, infer After extends string]
    ? After extends `)${infer Rest}`
      ? [Value, Rest]
      : never
    : never
  : ParseInt<S>;

type ParseTerm<S extends string> = ParseFactor<S> extends [
  infer Value extends number,
  infer Rest extends string,
]
  ? ParseTermPrime<Rest, Value>
  : never;

type ParseTermPrime<S extends string, Acc extends number> = S extends `*${infer Rest}`
  ? ParseFactor<Rest> extends [infer Value extends number, infer After extends string]
    ? ParseTermPrime<After, Mul<Acc, Value>>
    : never
  : [Acc, S];

type ParseExpr<S extends string> = ParseTerm<S> extends [
  infer Value extends number,
  infer Rest extends string,
]
  ? ParseExprPrime<Rest, Value>
  : never;

type ParseExprPrime<S extends string, Acc extends number> = S extends `+${infer Rest}`
  ? ParseTerm<Rest> extends [infer Value extends number, infer After extends string]
    ? ParseExprPrime<After, Add<Acc, Value>>
    : never
  : S extends `-${infer Rest}`
    ? ParseTerm<Rest> extends [infer Value extends number, infer After extends string]
      ? ParseExprPrime<After, Sub<Acc, Value>>
      : never
    : [Acc, S];

/**
 * Evaluate an arithmetic expression encoded as a string literal type to its
 * integer result. Operators `+`, `-`, `*`; `*` binds tighter; all
 * left-associative; parentheses group; whitespace is insignificant.
 */
export type Eval<S extends string> = ParseExpr<Strip<S>> extends [infer Value extends number, infer _Rest]
  ? Value
  : never;
