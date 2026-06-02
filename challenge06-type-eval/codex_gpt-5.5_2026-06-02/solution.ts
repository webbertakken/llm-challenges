type Whitespace = " " | "\n" | "\r" | "\t";

type StripWhitespace<S extends string> =
  S extends `${infer Head}${Whitespace}${infer Tail}`
    ? StripWhitespace<`${Head}${Tail}`>
    : S;

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type DigitValue<D extends Digit> = {
  "0": 0;
  "1": 1;
  "2": 2;
  "3": 3;
  "4": 4;
  "5": 5;
  "6": 6;
  "7": 7;
  "8": 8;
  "9": 9;
}[D];

type BuildTuple<N extends number, T extends unknown[] = []> =
  T["length"] extends N ? T : BuildTuple<N, [...T, unknown]>;

type Add<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]["length"] extends infer Result extends number
    ? Result
    : never;

type Sub<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer Rest] ? Rest["length"] : never;

type Mul<
  A extends number,
  B extends number,
  Total extends unknown[] = [],
> = B extends 0
  ? Total["length"] extends infer Result extends number
    ? Result
    : never
  : BuildTuple<B> extends [unknown, ...infer Rest]
    ? Mul<A, Rest["length"], [...Total, ...BuildTuple<A>]>
    : never;

type TimesTen<N extends number> = Mul<N, 10>;

type ParseNumber<
  S extends string,
  Acc extends number = 0,
  SeenDigit extends boolean = false,
> = S extends `${infer First}${infer Rest}`
  ? First extends Digit
    ? ParseNumber<Rest, Add<TimesTen<Acc>, DigitValue<First>>, true>
    : SeenDigit extends true
      ? [Acc, S]
      : never
  : SeenDigit extends true
    ? [Acc, ""]
    : never;

type ParseFactor<S extends string> =
  S extends `(${infer Rest}`
    ? ParseExpression<Rest> extends [infer Value extends number, infer AfterExpression extends string]
      ? AfterExpression extends `)${infer AfterClose}`
        ? [Value, AfterClose]
        : never
      : never
    : ParseNumber<S>;

type ParseTerm<S extends string> =
  ParseFactor<S> extends [infer Value extends number, infer Rest extends string]
    ? ParseTermRest<Value, Rest>
    : never;

type ParseTermRest<Acc extends number, S extends string> =
  S extends `*${infer Rest}`
    ? ParseFactor<Rest> extends [infer Value extends number, infer AfterFactor extends string]
      ? ParseTermRest<Mul<Acc, Value>, AfterFactor>
      : never
    : [Acc, S];

type ParseExpression<S extends string> =
  ParseTerm<S> extends [infer Value extends number, infer Rest extends string]
    ? ParseExpressionRest<Value, Rest>
    : never;

type ParseExpressionRest<Acc extends number, S extends string> =
  S extends `+${infer Rest}`
    ? ParseTerm<Rest> extends [infer Value extends number, infer AfterTerm extends string]
      ? ParseExpressionRest<Add<Acc, Value>, AfterTerm>
      : never
    : S extends `-${infer Rest}`
      ? ParseTerm<Rest> extends [infer Value extends number, infer AfterTerm extends string]
        ? ParseExpressionRest<Sub<Acc, Value>, AfterTerm>
        : never
      : [Acc, S];

export type Eval<S extends string> =
  ParseExpression<StripWhitespace<S>> extends [infer Value extends number, ""]
    ? Value
    : never;
