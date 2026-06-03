/**
 * Type-level arithmetic expression evaluator.
 *
 * `Eval<S>` takes an arithmetic expression encoded as a string literal type and
 * computes its integer result as a numeric literal type, entirely in the type
 * system with no runtime code.
 *
 * Pipeline:
 *   1. Lexing   — `Tokenize` turns the source string into a list of tokens.
 *   2. Parsing  — recursive-descent parser honouring precedence/associativity.
 *   3. Arithmetic — natural-number maths via tuple-length tricks.
 */

// ---------------------------------------------------------------------------
// Lexing
// ---------------------------------------------------------------------------

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";

/** Symbolic (non-number) tokens. */
type Symbol = "+" | "-" | "*" | "(" | ")";

/** A single lexical token: either a numeric literal or a symbol. */
type Token = number | Symbol;

type Tokens = Token[];

/** Parse a run of digit characters into a numeric literal type. */
type ToNumber<S extends string> = S extends `${infer N extends number}`
  ? N
  : never;

/** Append the pending digit buffer (if any) to the token list. */
type Flush<Acc extends Tokens, Buf extends string> = Buf extends ""
  ? Acc
  : [...Acc, ToNumber<Buf>];

/**
 * Turn a source string into a token list. Digits accumulate in `Buf` until a
 * non-digit boundary flushes them; whitespace is insignificant.
 */
type Tokenize<
  S extends string,
  Acc extends Tokens = [],
  Buf extends string = "",
> = S extends `${infer C}${infer Rest}`
  ? C extends Digit
    ? Tokenize<Rest, Acc, `${Buf}${C}`>
    : C extends " " | "\t" | "\n"
      ? Tokenize<Rest, Flush<Acc, Buf>, "">
      : C extends Symbol
        ? Tokenize<Rest, [...Flush<Acc, Buf>, C], "">
        : never // unexpected character
  : Flush<Acc, Buf>;

// ---------------------------------------------------------------------------
// Natural-number arithmetic (tuple-length encoding)
// ---------------------------------------------------------------------------

/**
 * Length of a tuple. Indexing a value bound to `unknown[]` (rather than a raw
 * recursive type) avoids "excessive stack depth" while computing `keyof`.
 */
type Length<T extends unknown[]> = T["length"];

/**
 * Coerce a computed value into a numeric literal type. The `infer N extends
 * number` pattern makes the result provably satisfy an `extends number`
 * constraint even while the operands are still generic during parsing.
 */
type AsNumber<X> = X extends infer N extends number ? N : never;

/** Build a tuple of length `N` (tail-recursive accumulator). */
type BuildTuple<
  N extends number,
  Acc extends unknown[] = [],
> = Acc["length"] extends N ? Acc : BuildTuple<N, [...Acc, unknown]>;

/** `A + B` as a numeric literal. */
type Add<A extends number, B extends number> = AsNumber<
  Length<[...BuildTuple<A>, ...BuildTuple<B>]>
>;

/** `A - B` as a numeric literal (caller guarantees `A >= B`). */
type Sub<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...infer Rest extends unknown[]]
    ? AsNumber<Length<Rest>>
    : never;

/** Build a tuple of length `len(A) * len(B)` by repeated spreading. */
type MulTuple<
  A extends unknown[],
  B extends unknown[],
  Acc extends unknown[] = [],
> = B extends [unknown, ...infer BRest]
  ? MulTuple<A, BRest, [...Acc, ...A]>
  : Acc;

/** `A * B` as a numeric literal. */
type Mul<A extends number, B extends number> = AsNumber<
  Length<MulTuple<BuildTuple<A>, BuildTuple<B>>>
>;

// ---------------------------------------------------------------------------
// Parsing (recursive descent)
//
//   expr   = term (("+" | "-") term)*
//   term   = factor ("*" factor)*
//   factor = number | "(" expr ")"
//
// Each parser returns `[value, remainingTokens]`.
// ---------------------------------------------------------------------------

type ParseResult = [number, Tokens];

/** factor = number | "(" expr ")" */
type ParseFactor<T extends Tokens> = T extends [
  infer Head,
  ...infer Tail extends Tokens,
]
  ? Head extends number
    ? [Head, Tail]
    : Head extends "("
      ? ParseExpr<Tail> extends [
          infer V extends number,
          infer Rest extends Tokens,
        ]
        ? Rest extends [")", ...infer After extends Tokens]
          ? [V, After]
          : never // missing closing paren
        : never
      : never // unexpected token
  : never; // unexpected end of input

/** term = factor ("*" factor)* — left-associative. */
type ParseTerm<T extends Tokens> =
  ParseFactor<T> extends [infer V extends number, infer Rest extends Tokens]
    ? ParseTermRest<V, Rest>
    : never;

type ParseTermRest<Acc extends number, T extends Tokens> = T extends [
  "*",
  ...infer Tail extends Tokens,
]
  ? ParseFactor<Tail> extends [
      infer V extends number,
      infer Rest extends Tokens,
    ]
    ? ParseTermRest<Mul<Acc, V>, Rest>
    : never
  : [Acc, T];

/** expr = term (("+" | "-") term)* — left-associative. */
type ParseExpr<T extends Tokens> =
  ParseTerm<T> extends [infer V extends number, infer Rest extends Tokens]
    ? ParseExprRest<V, Rest>
    : never;

type ParseExprRest<Acc extends number, T extends Tokens> = T extends [
  infer Op extends "+" | "-",
  ...infer Tail extends Tokens,
]
  ? ParseTerm<Tail> extends [
      infer V extends number,
      infer Rest extends Tokens,
    ]
    ? ParseExprRest<Op extends "+" ? Add<Acc, V> : Sub<Acc, V>, Rest>
    : never
  : [Acc, T];

// ---------------------------------------------------------------------------
// Public entry point
// ---------------------------------------------------------------------------

/**
 * Evaluate an arithmetic expression string literal to a numeric literal type.
 * Returns `never` for malformed input (e.g. leftover tokens).
 */
export type Eval<S extends string> =
  ParseExpr<Tokenize<S>> extends [
    infer V extends number,
    infer Rest extends Tokens,
  ]
    ? Rest extends []
      ? V
      : never // trailing, unconsumed tokens
    : never;
