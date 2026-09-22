/**
 * Type-level arithmetic evaluator.
 *
 * Recursive-descent parse of
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *   number = digit+
 *
 * Values are encoded as tuples; arithmetic is tuple concatenation / slicing.
 */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type DigitLen = {
  "0": [];
  "1": [unknown];
  "2": [unknown, unknown];
  "3": [unknown, unknown, unknown];
  "4": [unknown, unknown, unknown, unknown];
  "5": [unknown, unknown, unknown, unknown, unknown];
  "6": [unknown, unknown, unknown, unknown, unknown, unknown];
  "7": [unknown, unknown, unknown, unknown, unknown, unknown, unknown];
  "8": [unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown];
  "9": [
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
    unknown,
  ];
};

type SkipWs<S extends string> = S extends ` ${infer R}`
  ? SkipWs<R>
  : S extends `\t${infer R}`
    ? SkipWs<R>
    : S extends `\n${infer R}`
      ? SkipWs<R>
      : S extends `\r${infer R}`
        ? SkipWs<R>
        : S;

type TenTimes<T extends unknown[]> = [
  ...T,
  ...T,
  ...T,
  ...T,
  ...T,
  ...T,
  ...T,
  ...T,
  ...T,
  ...T,
];

type DecToTuple<S extends string, Acc extends unknown[] = []> = S extends `${infer D}${infer Rest}`
  ? D extends keyof DigitLen
    ? DecToTuple<Rest, [...TenTimes<Acc>, ...DigitLen[D]]>
    : Acc
  : Acc;

type SubTuples<A extends unknown[], B extends unknown[]> = A extends [
  ...B,
  ...infer Rest,
]
  ? Rest
  : never;

type MulTuples<
  A extends unknown[],
  B extends unknown[],
  Acc extends unknown[] = [],
> = B extends [unknown, ...infer Rest extends unknown[]]
  ? MulTuples<A, Rest, [...Acc, ...A]>
  : Acc;

type ParseNumber<
  S extends string,
  Acc extends string = "",
> = S extends `${infer D}${infer Rest}`
  ? D extends Digit
    ? ParseNumber<Rest, `${Acc}${D}`>
    : Acc extends ""
      ? never
      : [DecToTuple<Acc>, S]
  : Acc extends ""
    ? never
    : [DecToTuple<Acc>, S];

type ParseFactor<S extends string> = SkipWs<S> extends `(${infer Rest}`
  ? ParseExpr<Rest> extends [infer V extends unknown[], infer After extends string]
    ? SkipWs<After> extends `)${infer Rest2}`
      ? [V, Rest2]
      : never
    : never
  : ParseNumber<SkipWs<S>>;

type ParseTerm<S extends string> = ParseFactor<S> extends [
  infer Left extends unknown[],
  infer Rest extends string,
]
  ? ParseTermRest<Left, Rest>
  : never;

type ParseTermRest<
  Left extends unknown[],
  S extends string,
> = SkipWs<S> extends `*${infer Rest}`
  ? ParseFactor<Rest> extends [infer Right extends unknown[], infer After extends string]
    ? ParseTermRest<MulTuples<Left, Right>, After>
    : never
  : [Left, S];

type ParseExpr<S extends string> = ParseTerm<S> extends [
  infer Left extends unknown[],
  infer Rest extends string,
]
  ? ParseExprRest<Left, Rest>
  : never;

type ParseExprRest<
  Left extends unknown[],
  S extends string,
> = SkipWs<S> extends `+${infer Rest}`
  ? ParseTerm<Rest> extends [infer Right extends unknown[], infer After extends string]
    ? ParseExprRest<[...Left, ...Right], After>
    : never
  : SkipWs<S> extends `-${infer Rest}`
    ? ParseTerm<Rest> extends [infer Right extends unknown[], infer After extends string]
      ? ParseExprRest<SubTuples<Left, Right>, After>
      : never
    : [Left, S];

export type Eval<S extends string> = ParseExpr<S> extends [
  infer Value extends unknown[],
  infer Rest extends string,
]
  ? SkipWs<Rest> extends ""
    ? Value["length"]
    : never
  : never;
