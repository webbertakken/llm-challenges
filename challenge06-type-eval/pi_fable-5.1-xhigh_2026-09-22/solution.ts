/**
 * Type-level arithmetic evaluator.
 *
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *
 * Three layers: a lexer turning the string into a token tuple, a recursive
 * descent parser over that tuple that folds left-associatively, and natural
 * number arithmetic on tuples (a number is a tuple of that length; the final
 * `["length"]` turns it back into a numeric literal). Malformed input
 * evaluates to `never`.
 */

// ---------------------------------------------------------------------------
// Arithmetic on natural numbers represented as tuples
// ---------------------------------------------------------------------------

type Nat = unknown[];

type Add<A extends Nat, B extends Nat> = [...A, ...B];

type Sub<A extends Nat, B extends Nat> = A extends [...B, ...infer Difference] ? Difference : never;

type Mul<A extends Nat, B extends Nat, Product extends Nat = []> = B extends [unknown, ...infer Remaining]
  ? Mul<A, Remaining, [...Product, ...A]>
  : Product;

// ---------------------------------------------------------------------------
// Lexer: string -> Token[]
// ---------------------------------------------------------------------------

type Operator = "+" | "-" | "*" | "(" | ")";
type Whitespace = " " | "\t" | "\n" | "\r";
type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Token = Nat | Operator;

type DigitValue = {
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
};

type Times10<T extends Nat> = [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T];

/** Consumes a run of digits into a Nat; yields [value, rest of the input]. */
type ReadNumber<S extends string, Value extends Nat = []> = S extends `${infer D extends Digit}${infer Rest}`
  ? ReadNumber<Rest, [...Times10<Value>, ...DigitValue[D]]>
  : [Value, S];

type Tokenize<S extends string, Tokens extends Token[] = []> = S extends ""
  ? Tokens
  : S extends `${Whitespace}${infer Rest}`
    ? Tokenize<Rest, Tokens>
    : S extends `${infer Op extends Operator}${infer Rest}`
      ? Tokenize<Rest, [...Tokens, Op]>
      : S extends `${Digit}${string}`
        ? ReadNumber<S> extends [infer Value extends Nat, infer Rest extends string]
          ? Tokenize<Rest, [...Tokens, Value]>
          : never
        : never;

// ---------------------------------------------------------------------------
// Parser: Token[] -> [value, remaining tokens]
// ---------------------------------------------------------------------------

type ParseExpr<T extends Token[]> = ParseTerm<T> extends [infer Left extends Nat, infer Rest extends Token[]]
  ? ExprTail<Left, Rest>
  : never;

/** Folds `("+" | "-") term` repetitions onto `Acc`, left to right. */
type ExprTail<Acc extends Nat, T extends Token[]> = T extends ["+", ...infer Rest extends Token[]]
  ? ParseTerm<Rest> extends [infer Right extends Nat, infer After extends Token[]]
    ? ExprTail<Add<Acc, Right>, After>
    : never
  : T extends ["-", ...infer Rest extends Token[]]
    ? ParseTerm<Rest> extends [infer Right extends Nat, infer After extends Token[]]
      ? ExprTail<Sub<Acc, Right>, After>
      : never
    : [Acc, T];

type ParseTerm<T extends Token[]> = ParseFactor<T> extends [infer Left extends Nat, infer Rest extends Token[]]
  ? TermTail<Left, Rest>
  : never;

/** Folds `"*" factor` repetitions onto `Acc`, left to right. */
type TermTail<Acc extends Nat, T extends Token[]> = T extends ["*", ...infer Rest extends Token[]]
  ? ParseFactor<Rest> extends [infer Right extends Nat, infer After extends Token[]]
    ? TermTail<Mul<Acc, Right>, After>
    : never
  : [Acc, T];

type ParseFactor<T extends Token[]> = T extends [infer Value extends Nat, ...infer Rest extends Token[]]
  ? [Value, Rest]
  : T extends ["(", ...infer Rest extends Token[]]
    ? ParseExpr<Rest> extends [infer Value extends Nat, [")", ...infer After extends Token[]]]
      ? [Value, After]
      : never
    : never;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** Evaluates an arithmetic expression to its numeric literal type. */
export type Eval<S extends string> = ParseExpr<Tokenize<S>> extends [infer Value extends Nat, []] ? Value["length"] : never;
