/**
 * Type-level arithmetic evaluator.
 *
 * Recursive-descent parse of
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *   number = digit+
 *
 * Arithmetic is tuple-length based (non-negative integers only).
 */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Space = " " | "\t" | "\n" | "\r";

type Skip<S extends string> = S extends `${Space}${infer Rest}` ? Skip<Rest> : S;

type ToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;

// ---------------------------------------------------------------------------
// Natural-number arithmetic via tuple lengths
// ---------------------------------------------------------------------------

type Repeat<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Repeat<N, [...Acc, 0]>;

type Add<A extends number, B extends number> = [...Repeat<A>, ...Repeat<B>]["length"] extends infer N extends number
  ? N
  : never;

type Sub<A extends number, B extends number> = Repeat<A> extends [...Repeat<B>, ...infer Rest]
  ? Rest["length"] extends infer N extends number
    ? N
    : never
  : never;

type MulLoop<Left extends unknown[], Right extends unknown[], Acc extends unknown[] = []> =
  Left extends [unknown, ...infer Rest]
    ? MulLoop<Rest, Right, [...Acc, ...Right]>
    : Acc["length"];

type Mul<A extends number, B extends number> =
  MulLoop<Repeat<A>, Repeat<B>> extends infer N extends number ? N : never;

// ---------------------------------------------------------------------------
// Parser — each production returns [value, remaining]
// ---------------------------------------------------------------------------

type ParseNumber<S extends string, Acc extends string = ""> =
  S extends `${infer D}${infer Rest}`
    ? D extends Digit
      ? ParseNumber<Rest, `${Acc}${D}`>
      : Acc extends ""
        ? never
        : [ToNumber<Acc>, S]
    : Acc extends ""
      ? never
      : [ToNumber<Acc>, S];

type ParseFactor<S extends string> = Skip<S> extends `(${infer After}`
  ? ParseExpr<After> extends [infer Value extends number, infer Rest]
    ? Skip<Rest & string> extends `)${infer AfterParen}`
      ? [Value, AfterParen]
      : never
    : never
  : ParseNumber<Skip<S>>;

type ParseTerm<S extends string> = ParseFactor<S> extends [
  infer Left extends number,
  infer Rest,
]
  ? ParseTermTail<Left, Rest & string>
  : never;

type ParseTermTail<Left extends number, S extends string> = Skip<S> extends `*${infer After}`
  ? ParseFactor<After> extends [infer Right extends number, infer Rest]
    ? Mul<Left, Right> extends infer Product extends number
      ? ParseTermTail<Product, Rest & string>
      : never
    : never
  : [Left, S];

type ParseExpr<S extends string> = ParseTerm<S> extends [
  infer Left extends number,
  infer Rest,
]
  ? ParseExprTail<Left, Rest & string>
  : never;

type ParseExprTail<Left extends number, S extends string> = Skip<S> extends `+${infer After}`
  ? ParseTerm<After> extends [infer Right extends number, infer Rest]
    ? Add<Left, Right> extends infer Sum extends number
      ? ParseExprTail<Sum, Rest & string>
      : never
    : never
  : Skip<S> extends `-${infer After}`
    ? ParseTerm<After> extends [infer Right extends number, infer Rest]
      ? Sub<Left, Right> extends infer Diff extends number
        ? ParseExprTail<Diff, Rest & string>
        : never
      : never
    : [Left, S];

/**
 * Evaluate an arithmetic expression encoded as a string literal type.
 * The result is a numeric literal type.
 */
export type Eval<S extends string> = ParseExpr<S> extends [
  infer Value extends number,
  infer Rest,
]
  ? Skip<Rest & string> extends ""
    ? Value
    : never
  : never;
