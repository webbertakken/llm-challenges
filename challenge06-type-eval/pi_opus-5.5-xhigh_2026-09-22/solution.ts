/**
 * Type-level arithmetic evaluator: `Eval<"2+3*4">` is `14`.
 *
 * Grammar (whitespace between tokens is insignificant):
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *   number = digit+
 *
 * Pipeline: every stage is a tail-recursive loop over a flat list, so neither long inputs nor
 * deeply nested parentheses pile up type-instantiation depth.
 *
 *   1. Lex        "2 + 3*4"        -> ["2", "+", "3", "*", "4"]
 *   2. ToPostfix  shunting-yard    -> ["2", "3", "4", "*", "+"]   (also checks the grammar)
 *   3. Run        stack machine    -> the value as decimal digits
 *   4. ToNumber                    -> 14
 *
 * Arithmetic is exact on naturals of any size: numbers are little-endian decimal digit tuples,
 * and single digits are combined with tuple-length tricks. The final numeric literal is exact
 * up to Number.MAX_SAFE_INTEGER; beyond that `Eval` widens to `number`.
 * Malformed input, or a subtraction that would go negative, evaluates to `never`.
 *
 * Limits: TypeScript caps a tail-recursive loop at 1000 iterations and the lexer takes one character
 * per iteration, so sources of up to about 950 characters work. Nesting depth itself is not a limit:
 * 400 levels of parentheses evaluate fine.
 */

// ---------------------------------------------------------------------------
// Natural-number arithmetic on decimal digits
// ---------------------------------------------------------------------------

type Digit = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9;
type Bit = 0 | 1;

/** A natural number as little-endian decimal digits without leading zeros: 120 is [0, 2, 1], zero is []. */
export type Natural = Digit[];

/** `Unary[D]` is a tuple of length D, so digit sums and differences become tuple concatenation and matching. */
type Unary = [
  [],
  [1],
  [1, 1],
  [1, 1, 1],
  [1, 1, 1, 1],
  [1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1, 1],
];
type Ten = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1];

/** Splits a two-digit sum 0..19 into [units digit, carry]. */
type SplitTen = [
  [0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [7, 0], [8, 0], [9, 0],
  [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1], [8, 1], [9, 1],
];

type LowDigit<N extends Natural> = N extends [infer D extends Digit, ...Natural] ? D : 0;
type HigherDigits<N extends Natural> = N extends [Digit, ...infer Rest extends Natural] ? Rest : [];

type TrimLeadingZeros<N extends Digit[]> = N extends [...infer Rest extends Digit[], 0] ? TrimLeadingZeros<Rest> : N;

/** a + b + carry for single digits, as [digit, carry]. */
type AddDigits<A extends Digit, B extends Digit, Carry extends Bit> =
  [...Unary[A], ...Unary[B], ...Unary[Carry]]["length"] extends infer Sum extends number ? SplitTen[Sum] : never;

/** a - b - borrow for single digits, as [digit, borrow]. */
type SubtractDigits<A extends Digit, B extends Digit, Borrow extends Bit> =
  Unary[A] extends [...Unary[B], ...Unary[Borrow], ...infer Rest]
    ? [Rest["length"], 0]
    : [...Unary[A], ...Ten] extends [...Unary[B], ...Unary[Borrow], ...infer Rest]
      ? [Rest["length"], 1]
      : never;

/** Schoolbook addition, least significant digit first. */
export type Add<A extends Natural, B extends Natural, Carry extends Bit = 0, Sum extends Natural = []> =
  [A, B, Carry] extends [[], [], 0]
    ? Sum
    : AddDigits<LowDigit<A>, LowDigit<B>, Carry> extends [infer D extends Digit, infer C extends Bit]
      ? Add<HigherDigits<A>, HigherDigits<B>, C, [...Sum, D]>
      : never;

/** Schoolbook subtraction with borrow; `never` when b > a (the result would be negative). */
export type Subtract<A extends Natural, B extends Natural, Borrow extends Bit = 0, Difference extends Digit[] = []> =
  A extends []
    ? [B, Borrow] extends [[], 0]
      ? TrimLeadingZeros<Difference>
      : never
    : SubtractDigits<LowDigit<A>, LowDigit<B>, Borrow> extends [infer D extends Digit, infer B2 extends Bit]
      ? Subtract<HigherDigits<A>, HigherDigits<B>, B2, [...Difference, D]>
      : never;

type TimesTen<N extends Natural> = N extends [] ? [] : [0, ...N];

/** a * d for a single digit d, by repeated addition (at most 9 additions). */
type MultiplyByDigit<A extends Natural, D extends Digit, Count extends 1[] = [], Product extends Natural = []> =
  Count["length"] extends D ? Product : MultiplyByDigit<A, D, [...Count, 1], Add<Product, A>>;

/** Long multiplication in Horner form, from b's most significant digit down: p = p * 10 + a * d. */
export type Multiply<A extends Natural, B extends Natural, Product extends Natural = []> =
  B extends [...infer Lower extends Natural, infer D extends Digit]
    ? Multiply<A, Lower, Add<TimesTen<Product>, MultiplyByDigit<A, D>>>
    : Product;

/** "0042" -> [2, 4]. */
type ParseNatural<S extends string, Digits extends Digit[] = []> =
  S extends `${infer D extends Digit}${infer Rest}` ? ParseNatural<Rest, [D, ...Digits]> : TrimLeadingZeros<Digits>;

/** [2, 4] -> "42", [] -> "0". */
type ToDecimalString<N extends Natural, S extends string = ""> =
  N extends [infer D extends Digit, ...infer Rest extends Natural]
    ? ToDecimalString<Rest, `${D}${S}`>
    : S extends ""
      ? "0"
      : S;

/** The numeric literal type, or `number` when the value is too large to be represented exactly. */
type ToNumber<N extends Natural> = ToDecimalString<N> extends `${infer Value extends number}` ? Value : number;

// ---------------------------------------------------------------------------
// 1. Lexing
// ---------------------------------------------------------------------------

type Operator = "+" | "-" | "*";
type Punctuator = Operator | "(" | ")";
type NumberToken = `${Digit}${string}`;
export type Token = Punctuator | NumberToken;
type Whitespace = " " | "\t" | "\n" | "\r";

type FlushNumber<Tokens extends Token[], Pending extends string> =
  Pending extends NumberToken ? [...Tokens, Pending] : Tokens;

/** Splits the source into number and punctuator tokens, dropping whitespace; `never` on any other character. */
export type Lex<S extends string, Tokens extends Token[] = [], Pending extends string = ""> =
  S extends `${infer C}${infer Rest}`
    ? C extends `${Digit}`
      ? Lex<Rest, Tokens, `${Pending}${C}`>
      : C extends Whitespace
        ? Lex<Rest, FlushNumber<Tokens, Pending>>
        : C extends Punctuator
          ? Lex<Rest, [...FlushNumber<Tokens, Pending>, C]>
          : never
    : FlushNumber<Tokens, Pending>;

// ---------------------------------------------------------------------------
// 2. Parsing: shunting-yard to postfix, validated against the grammar
// ---------------------------------------------------------------------------

type StackEntry = Operator | "(";

/** Precedence levels as tuples, so "binds at least as tightly" is a tuple-prefix check. */
type Precedence = { "+": [1]; "-": [1]; "*": [1, 1] };

/** All operators are left-associative, so an equal-precedence operator already on the stack is applied first. */
type AppliesBefore<Top extends StackEntry, Incoming extends Operator> = Top extends Operator
  ? Precedence[Top] extends [...Precedence[Incoming], ...1[]]
    ? true
    : false
  : false;

/** Before pushing `Incoming`, move every stacked operator that applies before it to the output. */
type PopOperators<Output extends Token[], Stack extends StackEntry[], Incoming extends Operator> =
  Stack extends [...infer Below extends StackEntry[], infer Top extends StackEntry]
    ? AppliesBefore<Top, Incoming> extends true
      ? PopOperators<[...Output, Top], Below, Incoming>
      : [Output, Stack]
    : [Output, Stack];

/** On ")": move operators to the output down to the matching "(", which is dropped; `never` if there is none. */
type CloseGroup<Output extends Token[], Stack extends StackEntry[]> =
  Stack extends [...infer Below extends StackEntry[], infer Top extends StackEntry]
    ? Top extends "("
      ? [Output, Below]
      : CloseGroup<[...Output, Top], Below>
    : never;

/** At the end of input every remaining operator is emitted; a leftover "(" is unbalanced. */
type DrainOperators<Output extends Token[], Stack extends StackEntry[]> =
  Stack extends [...infer Below extends StackEntry[], infer Top extends StackEntry]
    ? Top extends "("
      ? never
      : DrainOperators<[...Output, Top], Below>
    : Output;

/**
 * Infix tokens to postfix. `Expecting` tracks the grammar: an operand (number or "(") must come
 * first and after every operator or "("; an operator, ")" or the end must follow every operand or ")".
 */
export type ToPostfix<
  Tokens extends Token[],
  Output extends Token[] = [],
  Stack extends StackEntry[] = [],
  Expecting extends "operand" | "operator" = "operand",
> = Tokens extends [infer T extends Token, ...infer Rest extends Token[]]
  ? Expecting extends "operand"
    ? T extends "("
      ? ToPostfix<Rest, Output, [...Stack, T], "operand">
      : T extends NumberToken
        ? ToPostfix<Rest, [...Output, T], Stack, "operator">
        : never
    : T extends ")"
      ? CloseGroup<Output, Stack> extends [infer O extends Token[], infer S extends StackEntry[]]
        ? ToPostfix<Rest, O, S, "operator">
        : never
      : T extends Operator
        ? PopOperators<Output, Stack, T> extends [infer O extends Token[], infer S extends StackEntry[]]
          ? ToPostfix<Rest, O, [...S, T], "operand">
          : never
        : never
  : Expecting extends "operator"
    ? DrainOperators<Output, Stack>
    : never;

// ---------------------------------------------------------------------------
// 3. Evaluation: a postfix stack machine
// ---------------------------------------------------------------------------

type Apply<Op extends Operator, Left extends Natural, Right extends Natural> = Op extends "+"
  ? Add<Left, Right>
  : Op extends "-"
    ? Subtract<Left, Right>
    : Multiply<Left, Right>;

type Run<Postfix extends Token[], Stack extends Natural[] = []> =
  Postfix extends [infer T extends Token, ...infer Rest extends Token[]]
    ? T extends Operator
      ? Stack extends [...infer Below extends Natural[], infer Left extends Natural, infer Right extends Natural]
        ? Apply<T, Left, Right> extends infer Value extends Natural
          ? [Value] extends [never]
            ? never
            : Run<Rest, [...Below, Value]>
          : never
        : never
      : T extends NumberToken
        ? Run<Rest, [...Stack, ParseNatural<T>]>
        : never
    : Stack extends [infer Result extends Natural]
      ? Result
      : never;

type Evaluate<Postfix> = Postfix extends Token[]
  ? Run<Postfix> extends infer Result extends Natural
    ? [Result] extends [never]
      ? never
      : ToNumber<Result>
    : never
  : never;

// ---------------------------------------------------------------------------
// 4. The evaluator
// ---------------------------------------------------------------------------

/** Evaluates an arithmetic expression over non-negative integers with `+`, `-`, `*` and parentheses. */
export type Eval<S extends string> = Evaluate<ToPostfix<Lex<S>>>;
