/**
 * A type-level arithmetic expression evaluator.
 *
 * The pipeline mirrors how a real interpreter is built, but every stage is a
 * type:
 *
 *   Eval<S>        tokenise -> parse -> evaluate -> unwrap
 *   Tokenize<S>    string literal type -> tuple of token string literals
 *   ParseExpr      recursive-descent parser over the token tuple
 *   Add/Sub/Mul    natural-number arithmetic via tuple lengths
 *
 * Grammar (whitespace insignificant, every value a non-negative integer):
 *
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *   number = digit+
 *
 * `*` binds tighter than `+`/`-`, and both are left-associative because the
 * parser threads the remaining tokens and folds as it goes.
 */

/* ------------------------------------------------------------------ *
 * Natural-number arithmetic via tuple lengths                         *
 * ------------------------------------------------------------------ */

/** A tuple of `N` `unknown` elements. Tail-recursive, so `N` may be large. */
type Repeat<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Repeat<N, [...Acc, unknown]>;

/** `A + B`, computed as the length of the concatenated tuples. */
type Add<A extends number, B extends number> = [...Repeat<A>, ...Repeat<B>]["length"] & number;

/** `A - B`. The contract guarantees the result is non-negative. */
type Sub<A extends number, B extends number> = Repeat<A> extends [
  ...Repeat<B>,
  ...infer Rest,
]
  ? Rest["length"] & number
  : never;

/** `A * B`, computed as repeated addition with a tail-recursive counter. */
type Mul<A extends number, B extends number, Acc extends number = 0, Count extends unknown[] = []> =
  Count["length"] extends B ? Acc : Mul<A, B, Add<Acc, A>, [...Count, unknown]>;

/* ------------------------------------------------------------------ *
 * Lexing                                                             *
 * ------------------------------------------------------------------ */

type Whitespace = " " | "\t" | "\n" | "\r";

type Operator = "+" | "-" | "*" | "(" | ")";

/**
 * Scans `S` into a tuple of token string literals. Digits accumulate into a
 * single number token; whitespace terminates the current token; every operator
 * is its own token.
 */
type Tokenize<
  S extends string,
  Current extends string = "",
  Tokens extends string[] = [],
> = S extends `${infer Char}${infer Rest}`
  ? Char extends Whitespace
    ? Tokenize<Rest, "", Current extends "" ? Tokens : [...Tokens, Current]>
    : Char extends Operator
      ? Tokenize<
          Rest,
          "",
          Current extends "" ? [...Tokens, Char] : [...Tokens, Current, Char]
        >
      : Tokenize<Rest, `${Current}${Char}`, Tokens>
  : Current extends ""
    ? Tokens
    : [...Tokens, Current];

/* ------------------------------------------------------------------ *
 * Parsing (and evaluating on the fly)                                *
 * ------------------------------------------------------------------ */

/** A parsed value together with the tokens that are still unread. */
type ParseResult = [value: number, rest: string[]];

/** Applies `Add` to the accumulator and the value of a completed term. */
type FoldAdd<Value extends number, Parsed extends ParseResult> = Parsed extends [
  infer Right extends number,
  infer Rest extends string[],
]
  ? [Add<Value, Right>, Rest]
  : never;

/** Applies `Sub` to the accumulator and the value of a completed term. */
type FoldSub<Value extends number, Parsed extends ParseResult> = Parsed extends [
  infer Right extends number,
  infer Rest extends string[],
]
  ? [Sub<Value, Right>, Rest]
  : never;

/** Applies `Mul` to the accumulator and the value of a completed factor. */
type FoldMul<Value extends number, Parsed extends ParseResult> = Parsed extends [
  infer Right extends number,
  infer Rest extends string[],
]
  ? [Mul<Value, Right>, Rest]
  : never;

/** `term (("+" | "-") term)*`, folding left to right. */
type ParseExpr<Tokens extends string[]> = ParseExprRest<ParseTerm<Tokens>>;

type ParseExprRest<State extends ParseResult> = State extends [
  infer Value extends number,
  infer Rest extends string[],
]
  ? Rest extends ["+", ...infer Tail extends string[]]
    ? ParseExprRest<FoldAdd<Value, ParseTerm<Tail>>>
    : Rest extends ["-", ...infer Tail extends string[]]
      ? ParseExprRest<FoldSub<Value, ParseTerm<Tail>>>
      : [Value, Rest]
  : never;

/** `factor ("*" factor)*`, folding left to right. */
type ParseTerm<Tokens extends string[]> = ParseTermRest<ParseFactor<Tokens>>;

type ParseTermRest<State extends ParseResult> = State extends [
  infer Value extends number,
  infer Rest extends string[],
]
  ? Rest extends ["*", ...infer Tail extends string[]]
    ? ParseTermRest<FoldMul<Value, ParseFactor<Tail>>>
    : [Value, Rest]
  : never;

/** `number | "(" expr ")"`. */
type ParseFactor<Tokens extends string[]> = Tokens extends [
  "(",
  ...infer Inner extends string[],
]
  ? ParseExpr<Inner> extends [infer Value extends number, [")", ...infer After extends string[]]]
    ? [Value, After]
    : never
  : Tokens extends [infer Head extends string, ...infer Rest extends string[]]
    ? Head extends `${infer N extends number}`
      ? [N, Rest]
      : never
    : never;

/* ------------------------------------------------------------------ *
 * Public entry point                                                  *
 * ------------------------------------------------------------------ */

/**
 * Evaluates an arithmetic expression encoded as a string literal type, e.g.
 * `Eval<"2+3*4">` is `14`. A malformed expression (or one with trailing
 * tokens) evaluates to `never`.
 */
export type Eval<S extends string> = ParseExpr<Tokenize<S>> extends [
  infer Value extends number,
  [],
]
  ? Value
  : never;
