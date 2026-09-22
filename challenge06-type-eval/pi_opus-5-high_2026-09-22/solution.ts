/**
 * A type-level arithmetic evaluator.
 *
 *   Eval<"2+3*4">         // 14
 *   Eval<"(2+3)*4">       // 20
 *   Eval<"10 - 2 - 3">    // 5
 *   Eval<"((1+2)*(3+4))"> // 21
 *
 * Structure (mirrors a hand-written recursive-descent evaluator):
 *
 *   Arithmetic  — natural numbers as tuple lengths: Add, Sub, Mul.
 *   Lexing      — whitespace is stripped; digits are consumed by the parser.
 *   Parsing     — expr := term (("+" | "-") term)*
 *                 term := factor ("*" factor)*
 *                 factor := number | "(" expr ")"
 *                 Each parser returns [value, rest-of-input] and the loops fold
 *                 left, which is what makes every operator left-associative.
 *
 * Everything is type-level only; this module emits no runtime code.
 */

/* -------------------------------------------------------------------------- */
/* Arithmetic on natural numbers, via tuple lengths                           */
/* -------------------------------------------------------------------------- */

/** A tuple of length `N`. Tail-recursive, so TypeScript can iterate deeply. */
type Tuple<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Tuple<N, [...Acc, unknown]>;

/** The length of a tuple, as a numeric literal type. */
type Length<T extends unknown[]> = T["length"] extends infer N extends number ? N : never;

type Add<A extends number, B extends number> = Length<[...Tuple<A>, ...Tuple<B>]>;

/** `A - B`, saturating at `never` if the result would be negative. */
type Sub<A extends number, B extends number> = Tuple<A> extends [...Tuple<B>, ...infer Rest]
  ? Length<Rest>
  : never;

/** Repeated concatenation: `Acc` grows by one copy of `A` per element of `B`. */
type MulTuples<
  A extends unknown[],
  B extends unknown[],
  Acc extends unknown[] = [],
> = B extends [unknown, ...infer Rest] ? MulTuples<A, Rest, [...Acc, ...A]> : Acc;

type Mul<A extends number, B extends number> = Length<MulTuples<Tuple<A>, Tuple<B>>>;

/* -------------------------------------------------------------------------- */
/* Lexing                                                                     */
/* -------------------------------------------------------------------------- */

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

type DigitValue = {
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
};

type Whitespace = " " | "\t" | "\n" | "\r";

/** Removes all insignificant whitespace before parsing. */
type StripWhitespace<S extends string, Acc extends string = ""> = S extends `${infer Head}${infer Rest}`
  ? Head extends Whitespace
    ? StripWhitespace<Rest, Acc>
    : StripWhitespace<Rest, `${Acc}${Head}`>
  : Acc;

/* -------------------------------------------------------------------------- */
/* Parsing                                                                    */
/* -------------------------------------------------------------------------- */

/** What every parser returns: the value parsed and the input still unread. */
type Parsed = [value: number, rest: string];

/** Ten copies of `T` — one decimal shift of a tuple-encoded number. */
type ShiftDecimal<T extends unknown[]> = [
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

/**
 * `number := digit+`, accumulated left to right as `value * 10 + digit`.
 * `Started` tracks whether at least one digit was consumed, so a factor that
 * begins with something else fails instead of silently parsing as zero.
 */
type ParseNumber<
  S extends string,
  Acc extends unknown[] = [],
  Started extends boolean = false,
> = S extends `${infer Head extends Digit}${infer Rest}`
  ? ParseNumber<Rest, [...ShiftDecimal<Acc>, ...Tuple<DigitValue[Head]>], true>
  : Started extends true
    ? [Length<Acc>, S]
    : never;

/** `factor := number | "(" expr ")"`. */
type ParseFactor<S extends string> = S extends `(${infer Inner}`
  ? ParseExpr<Inner> extends [infer Value extends number, infer Rest extends string]
    ? Rest extends `)${infer After}`
      ? [Value, After]
      : never
    : never
  : ParseNumber<S>;

/** `term := factor ("*" factor)*`, folded left. */
type ParseTerm<S extends string> = ParseFactor<S> extends [
  infer Value extends number,
  infer Rest extends string,
]
  ? TermLoop<Value, Rest>
  : never;

type TermLoop<Value extends number, S extends string> = S extends `*${infer Tail}`
  ? ParseFactor<Tail> extends [infer Right extends number, infer Rest extends string]
    ? TermLoop<Mul<Value, Right>, Rest>
    : never
  : [Value, S];

/** `expr := term (("+" | "-") term)*`, folded left. */
type ParseExpr<S extends string> = ParseTerm<S> extends [
  infer Value extends number,
  infer Rest extends string,
]
  ? ExprLoop<Value, Rest>
  : never;

type ExprLoop<Value extends number, S extends string> = S extends `+${infer Tail}`
  ? ParseTerm<Tail> extends [infer Right extends number, infer Rest extends string]
    ? ExprLoop<Add<Value, Right>, Rest>
    : never
  : S extends `-${infer Tail}`
    ? ParseTerm<Tail> extends [infer Right extends number, infer Rest extends string]
      ? ExprLoop<Sub<Value, Right>, Rest>
      : never
    : [Value, S];

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/**
 * Evaluates an arithmetic expression written as a string literal type.
 * Malformed input (unbalanced parentheses, stray characters, an empty
 * expression) resolves to `never` rather than a wrong number.
 */
export type Eval<S extends string> = ParseExpr<StripWhitespace<S>> extends [
  infer Value extends number,
  "",
]
  ? Value
  : never;

export type { Parsed as ParserResult };
