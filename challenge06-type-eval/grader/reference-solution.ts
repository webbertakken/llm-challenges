/**
 * Reference solution for challenge 06 — a type-level arithmetic evaluator.
 *
 * `Eval<S>` parses and evaluates an integer arithmetic expression encoded in a
 * string literal type, returning the result as a numeric literal type.
 *
 * Grammar (whitespace allowed between tokens):
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *   number = digit+
 *
 * Precedence: `*` binds tighter than `+`/`-`; all operators left-associative.
 * Inputs are guaranteed to keep every intermediate and final value a
 * non-negative integer.
 *
 * Do NOT read this file while solving the challenge.
 */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

// ----- natural-number arithmetic via tuple lengths --------------------------

type Tuple<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Tuple<N, [...Acc, unknown]>;

type Add<A extends number, B extends number> = [
  ...Tuple<A>,
  ...Tuple<B>,
]["length"] &
  number;

type Sub<A extends number, B extends number> = Tuple<A> extends [
  ...Tuple<B>,
  ...infer Rest,
]
  ? Rest["length"] & number
  : never;

type MulAcc<
  A extends number,
  B extends number,
  Acc extends unknown[] = [],
> = B extends 0 ? Acc : MulAcc<A, Sub<B, 1>, [...Acc, ...Tuple<A>]>;

type Mul<A extends number, B extends number> = MulAcc<A, B>["length"] & number;

// ----- lexing helpers -------------------------------------------------------

type TrimLeft<S extends string> = S extends ` ${infer R}` ? TrimLeft<R> : S;

type ToNum<S extends string> = S extends `${infer N extends number}` ? N : never;

type ParseDigits<
  S extends string,
  Acc extends string = "",
> = S extends `${infer C}${infer Rest}`
  ? C extends Digit
    ? ParseDigits<Rest, `${Acc}${C}`>
    : [Acc, S]
  : [Acc, S];

type ParseNumber<S extends string> = ParseDigits<TrimLeft<S>> extends [
  infer D extends string,
  infer Rest extends string,
]
  ? D extends ""
    ? never
    : [ToNum<D>, Rest]
  : never;

// ----- recursive-descent parser (each step returns [value, rest]) -----------

type ParseFactor<S extends string> = TrimLeft<S> extends `(${infer R}`
  ? ParseExpr<R> extends [infer V extends number, infer Rest extends string]
    ? TrimLeft<Rest> extends `)${infer After}`
      ? [V, After]
      : never
    : never
  : ParseNumber<S>;

type ParseTermLoop<
  Acc extends number,
  S extends string,
> = TrimLeft<S> extends `*${infer R}`
  ? ParseFactor<R> extends [infer V extends number, infer Rest extends string]
    ? ParseTermLoop<Mul<Acc, V>, Rest>
    : never
  : [Acc, S];

type ParseTerm<S extends string> = ParseFactor<S> extends [
  infer V extends number,
  infer Rest extends string,
]
  ? ParseTermLoop<V, Rest>
  : never;

type ParseExprLoop<
  Acc extends number,
  S extends string,
> = TrimLeft<S> extends `+${infer R}`
  ? ParseTerm<R> extends [infer V extends number, infer Rest extends string]
    ? ParseExprLoop<Add<Acc, V>, Rest>
    : never
  : TrimLeft<S> extends `-${infer R}`
    ? ParseTerm<R> extends [infer V extends number, infer Rest extends string]
      ? ParseExprLoop<Sub<Acc, V>, Rest>
      : never
    : [Acc, S];

type ParseExpr<S extends string> = ParseTerm<S> extends [
  infer V extends number,
  infer Rest extends string,
]
  ? ParseExprLoop<V, Rest>
  : never;

export type Eval<S extends string> = ParseExpr<S> extends [
  infer V extends number,
  string,
]
  ? V
  : never;
