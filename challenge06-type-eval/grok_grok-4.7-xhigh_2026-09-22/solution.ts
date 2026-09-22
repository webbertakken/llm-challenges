/**
 * Type-level evaluator for + - * with * tighter than +/-, left associativity,
 * and parentheses. Arithmetic is tuple length. Whitespace is ignored.
 */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type White = " " | "\t" | "\n" | "\r" | "\f" | "\v";

type SkipWs<S extends string> = S extends `${White}${infer Rest}` ? SkipWs<Rest> : S;

type Build<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Build<N, [...Acc, unknown]>;

type Len<T extends unknown[]> = T["length"] extends infer L extends number ? L : never;

type Add<A extends number, B extends number> = Len<[...Build<A>, ...Build<B>]>;

type Sub<A extends number, B extends number> = Build<A> extends [...Build<B>, ...infer Rest extends unknown[]]
  ? Len<Rest>
  : never;

/** Repeat `chunk` once per element of `times`. Recurses on the smaller factor. */
type Repeat<Chunk extends unknown[], Times extends unknown[], Acc extends unknown[] = []> = Times extends [
  unknown,
  ...infer Rest extends unknown[],
]
  ? Repeat<Chunk, Rest, [...Acc, ...Chunk]>
  : Len<Acc>;

type Mul<A extends number, B extends number> = Build<A> extends [...Build<B>, ...unknown[]]
  ? Repeat<Build<B>, Build<A>>
  : Repeat<Build<A>, Build<B>>;

type ToNat<S extends string> = S extends `0${infer Rest}`
  ? Rest extends ""
    ? 0
    : ToNat<Rest>
  : S extends `${infer N extends number}`
    ? N
    : never;

type ParseNumber<S extends string, Digits extends string = ""> = S extends `${infer D extends Digit}${infer Rest}`
  ? ParseNumber<Rest, `${Digits}${D}`>
  : Digits extends ""
    ? never
    : [ToNat<Digits>, S];

type ParseFactor<S extends string> = SkipWs<S> extends `(${infer Rest}`
  ? ParseExpr<Rest> extends [infer Value extends number, infer After extends string]
    ? SkipWs<After> extends `)${infer Tail}`
      ? [Value, Tail]
      : never
    : never
  : ParseNumber<SkipWs<S>>;

type ParseTerm<S extends string> = ParseFactor<S> extends [infer Value extends number, infer Rest extends string]
  ? ParseTermRest<Value, Rest>
  : never;

type ParseTermRest<Acc extends number, S extends string> = SkipWs<S> extends `*${infer Rest}`
  ? ParseFactor<Rest> extends [infer Value extends number, infer After extends string]
    ? ParseTermRest<Mul<Acc, Value>, After>
    : never
  : [Acc, S];

type ParseExpr<S extends string> = ParseTerm<S> extends [infer Value extends number, infer Rest extends string]
  ? ParseExprRest<Value, Rest>
  : never;

type ParseExprRest<Acc extends number, S extends string> = SkipWs<S> extends `+${infer Rest}`
  ? ParseTerm<Rest> extends [infer Value extends number, infer After extends string]
    ? ParseExprRest<Add<Acc, Value>, After>
    : never
  : SkipWs<S> extends `-${infer Rest}`
    ? ParseTerm<Rest> extends [infer Value extends number, infer After extends string]
      ? ParseExprRest<Sub<Acc, Value>, After>
      : never
    : [Acc, S];

/** Integer value of an arithmetic expression, or `never` if it does not parse. */
export type Eval<S extends string> = ParseExpr<S> extends [infer Value extends number, infer Rest extends string]
  ? SkipWs<Rest> extends ""
    ? Value
    : never
  : never;
