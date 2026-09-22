/**
 * Type-level arithmetic expression evaluator.
 *
 *   Eval<"2+3*4">  // 14
 *
 * Pipeline: Tokenize (string -> token tuple) -> Evaluate (operator-precedence parse that
 * evaluates as it goes) -> ToNumber. Values are carried as decimal digit strings and combined
 * with schoolbook digit-by-digit arithmetic, so results are not limited by tuple lengths and multi-digit numbers
 * stay cheap. Any malformed input (unknown character, unbalanced parentheses, dangling operator,
 * trailing tokens) or a negative intermediate result evaluates to `never`.
 *
 * Grammar (whitespace between tokens is insignificant):
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *   number = digit+
 */

// ===========================================================================
// Digits
// ===========================================================================

type Digit = "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9";
type Bit = 0 | 1;

/** Unary encoding of a digit, used only for single-digit arithmetic. */
type Unary = {
  "0": [];
  "1": [1];
  "2": [1, 1];
  "3": [1, 1, 1];
  "4": [1, 1, 1, 1];
  "5": [1, 1, 1, 1, 1];
  "6": [1, 1, 1, 1, 1, 1];
  "7": [1, 1, 1, 1, 1, 1, 1];
  "8": [1, 1, 1, 1, 1, 1, 1, 1];
  "9": [1, 1, 1, 1, 1, 1, 1, 1, 1];
};
type UnaryBit = [[], [1]];
type Ten = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

/** Splits 0..19 into [carry, digit]. */
type SplitTens<N> = N extends number
  ? `${N}` extends Digit
    ? [0, `${N}`]
    : `${N}` extends `1${infer D extends Digit}`
      ? [1, D]
      : never
  : never;

/** a + b + carry  ->  [carry, digit] */
type DigitAdd<A extends Digit, B extends Digit, C extends Bit> = SplitTens<
  [...Unary[A], ...Unary[B], ...UnaryBit[C]]["length"]
>;

/** a - b - borrow  ->  [borrow, digit] */
type DigitSub<A extends Digit, B extends Digit, C extends Bit> = Unary[A] extends [
  ...Unary[B],
  ...UnaryBit[C],
  ...infer Rest,
]
  ? [0, `${Rest["length"]}`]
  : [...Unary[A], ...Ten] extends [...Unary[B], ...UnaryBit[C], ...infer Rest]
    ? [1, `${Rest["length"]}`]
    : never;

// ===========================================================================
// Natural-number arithmetic on decimal strings (no leading zeros)
// ===========================================================================

type Reverse<S extends string, Acc extends string = ""> = S extends `${infer H}${infer T}`
  ? Reverse<T, `${H}${Acc}`>
  : Acc;

type StripLeadingZeros<S extends string> = S extends `0${infer Rest}`
  ? Rest extends ""
    ? "0"
    : StripLeadingZeros<Rest>
  : S;

/**
 * Adds two digit strings given least-significant digit first; the result is built most
 * significant digit first by prepending each new digit.
 */
type AddReversed<A extends string, B extends string, C extends Bit = 0, Acc extends string = ""> = [
  A,
  B,
] extends ["", ""]
  ? C extends 1
    ? `1${Acc}`
    : Acc
  : [A extends "" ? "0" : A, B extends "" ? "0" : B] extends [
        `${infer DA extends Digit}${infer RA}`,
        `${infer DB extends Digit}${infer RB}`,
      ]
    ? DigitAdd<DA, DB, C> extends [infer Carry extends Bit, infer D extends Digit]
      ? AddReversed<RA, RB, Carry, `${D}${Acc}`>
      : never
    : never;

/** Like AddReversed; a final borrow means A < B, which has no natural-number result. */
type SubReversed<A extends string, B extends string, C extends Bit = 0, Acc extends string = ""> = [
  A,
  B,
] extends ["", ""]
  ? C extends 1
    ? never
    : StripLeadingZeros<Acc>
  : A extends ""
    ? never
    : [A, B extends "" ? "0" : B] extends [`${infer DA extends Digit}${infer RA}`, `${infer DB extends Digit}${infer RB}`]
      ? DigitSub<DA, DB, C> extends [infer Borrow extends Bit, infer D extends Digit]
        ? SubReversed<RA, RB, Borrow, `${D}${Acc}`>
        : never
      : never;

export type Add<A extends string, B extends string> = AddReversed<Reverse<A>, Reverse<B>>;
export type Subtract<A extends string, B extends string> = SubReversed<Reverse<A>, Reverse<B>>;

type Times10<A extends string> = A extends "0" ? "0" : `${A}0`;

/** A * d for a single digit d, by repeated addition (at most 9 additions). */
type MultiplyByDigit<A extends string, D extends Digit, Count extends 1[] = [], Acc extends string = "0"> =
  Count["length"] extends Unary[D]["length"] ? Acc : MultiplyByDigit<A, D, [...Count, 1], Add<Acc, A>>;

/** Horner's scheme over the digits of B: acc = acc * 10 + A * digit. */
export type Multiply<A extends string, B extends string, Acc extends string = "0"> =
  B extends `${infer D extends Digit}${infer Rest}`
    ? Multiply<A, Rest, Add<Times10<Acc>, MultiplyByDigit<A, D>>>
    : Acc;

// ===========================================================================
// Lexer: string -> tuple of tokens
// ===========================================================================

type Whitespace = " " | "\t" | "\n" | "\r";
type Punctuator = "+" | "-" | "*" | "(" | ")";

/** Appends the pending number (if any) to the token list. */
type Flush<Tokens extends string[], Pending extends string> = Pending extends "" ? Tokens : [...Tokens, Pending];

export type Tokenize<S extends string, Tokens extends string[] = [], Pending extends string = ""> =
  S extends `${infer C}${infer Rest}`
    ? C extends Digit
      ? Tokenize<Rest, Tokens, `${Pending}${C}`>
      : C extends Whitespace
        ? Tokenize<Rest, Flush<Tokens, Pending>, "">
        : C extends Punctuator
          ? Tokenize<Rest, [...Flush<Tokens, Pending>, C], "">
          : never // unknown character
    : Flush<Tokens, Pending>;

// ===========================================================================
// Parser + evaluator: operator-precedence (shunting-yard) machine.
//
// A single tail-recursive loop over the tokens with an explicit value stack and operator stack,
// so nesting depth and expression length are bounded only by TypeScript's tail-recursion budget
// (about 1000 steps), not by the much smaller budget for nested type instantiations.
//
// It accepts exactly the grammar above. The machine alternates between two modes:
//   "operand"  - expects a number or "(" (the start of a factor);
//   "operator" - expects "+", "-", "*", ")" or the end of input.
// On an operator, pending operators of higher or EQUAL precedence are applied first; applying on
// equal precedence is what makes every operator left-associative ("*" = 2, "+" / "-" = 1).
// Anything unexpected (or leftover "(" / missing "(") yields never.
// ===========================================================================

type BinaryOperator = "+" | "-" | "*";
type StackedOperator = BinaryOperator | "(";

type Precedence = { "+": 1; "-": 1; "*": 2 };

/** Must the operator on top of the stack be applied before pushing `Incoming`? */
type AppliesBefore<Top extends StackedOperator, Incoming extends BinaryOperator> = Top extends BinaryOperator
  ? [Precedence[Incoming]] extends [2]
    ? [Precedence[Top]] extends [2]
      ? true
      : false
    : true
  : false; // "(" is a barrier

type Apply<Op extends BinaryOperator, A extends string, B extends string> = Op extends "+"
  ? Add<A, B>
  : Op extends "-"
    ? Subtract<A, B>
    : Multiply<A, B>;

/** Pops two values and one operator, pushes the result. */
type Reduce<Values extends string[], Op extends BinaryOperator> = Values extends [
  ...infer Rest extends string[],
  infer A extends string,
  infer B extends string,
]
  ? [...Rest, Apply<Op, A, B>]
  : never;

type IsNumber<T extends string> = T extends `${Digit}${string}` ? true : false;

type Evaluate<
  Tokens extends string[],
  Values extends string[] = [],
  Ops extends StackedOperator[] = [],
  Mode extends "operand" | "operator" = "operand",
> = Mode extends "operand"
  ? // factor = number | "(" expr ")"
    Tokens extends [infer Token extends string, ...infer Rest extends string[]]
    ? Token extends "("
      ? Evaluate<Rest, Values, [...Ops, "("], "operand">
      : IsNumber<Token> extends true
        ? Evaluate<Rest, [...Values, StripLeadingZeros<Token>], Ops, "operator">
        : never // operator or ")" where an operand belongs
    : never // input ends with a dangling operator (or is empty)
  : // after a complete operand: first apply everything the next token closes off
    Ops extends [...infer Below extends StackedOperator[], infer Top extends StackedOperator]
    ? Tokens extends []
      ? Top extends BinaryOperator
        ? Evaluate<Tokens, Reduce<Values, Top>, Below, "operator">
        : never // unclosed "("
      : Tokens extends [")", ...infer Rest extends string[]]
        ? Top extends BinaryOperator
          ? Evaluate<Tokens, Reduce<Values, Top>, Below, "operator">
          : Evaluate<Rest, Values, Below, "operator"> // matching "(" found
        : Tokens extends [infer Op extends BinaryOperator, ...infer Rest extends string[]]
          ? AppliesBefore<Top, Op> extends true
            ? Top extends BinaryOperator
              ? Evaluate<Tokens, Reduce<Values, Top>, Below, "operator">
              : never
            : Evaluate<Rest, Values, [...Ops, Op], "operand">
          : never // a number or "(" directly after an operand
    : // empty operator stack
      Tokens extends []
      ? Values extends [infer Result extends string]
        ? Result
        : never
      : Tokens extends [infer Op extends BinaryOperator, ...infer Rest extends string[]]
        ? Evaluate<Rest, Values, [Op], "operand">
        : never; // unmatched ")" or two operands in a row

// ===========================================================================
// Entry point
// ===========================================================================

type ToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;

export type Eval<S extends string> = ToNumber<EvalToString<S>>;

/** Exposed for tests: the parse result as a decimal string (no number-precision limit). */
export type EvalToString<S extends string> = Evaluate<Tokenize<S>>;
