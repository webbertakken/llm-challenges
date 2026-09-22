/**
 * Type-level arithmetic evaluator.
 *
 *   expr   = term (("+" | "-") term)*
 *   term   = factor ("*" factor)*
 *   factor = number | "(" expr ")"
 *   number = digit+
 *
 * Pipeline: Lex (string -> tokens) -> EvalTokens (stack-based parenthesis scan + recursive descent
 * over each parenthesis-free group, evaluating as it goes)
 * -> numeric literal. Natural numbers are represented as tuples whose length is the value.
 * Malformed input evaluates to `never`.
 */

// ---------------------------------------------------------------- Arithmetic (tuple naturals)

type Nat = readonly unknown[];

type DigitTuples = {
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

type Digit = keyof DigitTuples;

type Times10<N extends Nat> = [...N, ...N, ...N, ...N, ...N, ...N, ...N, ...N, ...N, ...N];

/** Decimal digit string -> tuple, one digit at a time (Horner's scheme), so large numbers stay cheap. */
type FromDigits<S extends string, Acc extends Nat = []> = S extends `${infer D extends Digit}${infer Rest}`
  ? FromDigits<Rest, [...Times10<Acc>, ...DigitTuples[D]]>
  : Acc;

type Add<A extends Nat, B extends Nat> = [...A, ...B];

/** Truncated subtraction (inputs guarantee A >= B). */
type Sub<A extends Nat, B extends Nat> = A extends readonly [...B, ...infer Rest] ? Rest : [];

type Mul<A extends Nat, B extends Nat, Acc extends Nat = []> = B extends readonly [unknown, ...infer Rest]
  ? Mul<A, Rest, [...Acc, ...A]>
  : Acc;

// ---------------------------------------------------------------- Lexer

type Whitespace = " " | "\t" | "\n" | "\r";
type Punctuator = "+" | "-" | "*" | "(" | ")";

/** A token is an operator/parenthesis character or a number (as a tuple natural). */
type Token = Punctuator | Nat;

/** Splits a leading run of digits off `S`: [digits, rest]. */
type TakeDigits<S extends string, Digits extends string = ""> = S extends `${infer D extends Digit}${infer Rest}`
  ? TakeDigits<Rest, `${Digits}${D}`>
  : [Digits, S];

type Lex<S extends string, Tokens extends Token[] = []> = S extends `${infer C}${infer Rest}`
  ? C extends Whitespace
    ? Lex<Rest, Tokens>
    : C extends Punctuator
      ? Lex<Rest, [...Tokens, C]>
      : C extends Digit
        ? TakeDigits<S> extends [infer Digits extends string, infer After extends string]
          ? Lex<After, [...Tokens, FromDigits<Digits>]>
          : never
        : never // unexpected character
  : Tokens;

// ---------------------------------------------------------------- Parser / evaluator
//
// Parentheses are resolved by a single left-to-right, tail-recursive scan with an explicit
// stack of open groups: "(" pushes the tokens collected so far, ")" evaluates the innermost
// (parenthesis-free) group and appends its value to the enclosing one. Because the scan is a
// loop rather than nested recursion, nesting depth is not bounded by TypeScript's instantiation
// depth limit. Each parenthesis-free group is evaluated by a small recursive-descent parser for
//
//   flat = term (("+" | "-") term)*      term = number ("*" number)*
//
// Every parse function returns [value, remainingTokens], or never on a syntax error.

type ParseSum<T extends Token[]> = ParseProduct<T> extends [infer V extends Nat, infer Rest extends Token[]]
  ? SumTail<V, Rest>
  : never;

type SumTail<Acc extends Nat, T extends Token[]> = T extends [infer Op extends "+" | "-", ...infer Rest extends Token[]]
  ? ParseProduct<Rest> extends [infer V extends Nat, infer After extends Token[]]
    ? SumTail<Op extends "+" ? Add<Acc, V> : Sub<Acc, V>, After>
    : never
  : [Acc, T];

type ParseProduct<T extends Token[]> = T extends [infer N extends Nat, ...infer Rest extends Token[]]
  ? ProductTail<N, Rest>
  : never;

type ProductTail<Acc extends Nat, T extends Token[]> = T extends ["*", infer N extends Nat, ...infer Rest extends Token[]]
  ? ProductTail<Mul<Acc, N>, Rest>
  : [Acc, T];

/** Evaluates a parenthesis-free token list; the parse must consume every token. */
type EvalFlat<T extends Token[]> = ParseSum<T> extends [infer V extends Nat, []] ? V : never;

type EvalTokens<T extends Token[], Group extends Token[] = [], Stack extends Token[][] = []> = T extends [
  infer Head extends Token,
  ...infer Rest extends Token[],
]
  ? Head extends "("
    ? EvalTokens<Rest, [], [...Stack, Group]>
    : Head extends ")"
      ? Stack extends [...infer Outer extends Token[][], infer Enclosing extends Token[]]
        ? [EvalFlat<Group>] extends [never]
          ? never // malformed group
          : EvalTokens<Rest, [...Enclosing, EvalFlat<Group>], Outer>
        : never // unmatched ")"
      : EvalTokens<Rest, [...Group, Head], Stack>
  : Stack extends []
    ? EvalFlat<Group>
    : never; // unclosed "("

/** Evaluates an arithmetic expression string literal to its numeric literal result. */
export type Eval<S extends string> = [EvalTokens<Lex<S>>] extends [infer V extends Nat] ? V["length"] : never;
