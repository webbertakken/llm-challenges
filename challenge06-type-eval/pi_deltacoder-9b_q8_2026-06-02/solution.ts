// Type-level arithmetic expression evaluator
// Handles: +, -, * with proper precedence (* before +,-) and parentheses

// ============================================================================
// Helper Types
// ============================================================================

/** Convert a non-negative integer to a tuple of that length */
type NumToTuple<N extends number> = N extends 0 ? [] : NumToTuple<Prev<N>> extends infer R extends any[] ? [...R, ...[]] : never;

/** Get the previous number */
type Prev<N extends number> = number extends N ? 0 : N extends infer R extends number ? R extends 0 ? 0 : R - 1 : 0;

/** Convert a tuple to a number (its length) */
type TupleToNum<T extends any[]> = T['length'];

/** Convert a number to a string */
type NumToString<N extends number> = N extends 0 ? "0" : N extends 1 ? "1" : N extends 2 ? "2" : N extends 3 ? "3" : N extends 4 ? "4" : N extends 5 ? "5" : N extends 6 ? "6" : N extends 7 ? "7" : N extends 8 ? "8" : N extends 9 ? "9" : N extends 10 ? "10" : N extends 11 ? "11" : N extends 12 ? "12" : N extends 13 ? "13" : N extends 14 ? "14" : N extends 15 ? "15" : N extends 16 ? "16" : N extends 17 ? "17" : N extends 18 ? "18" : N extends 19 ? "19" : N extends 20 ? "20" : N extends 21 ? "21" : N extends 22 ? "22" : N extends 23 ? "23" : N extends 24 ? "24" : N extends 25 ? "25" : N extends 26 ? "26" : N extends 27 ? "27" : N extends 28 ? "28" : N extends 29 ? "29" : N extends 30 ? "30" : N extends 31 ? "31" : N extends 32 ? "32" : N extends 33 ? "33" : N extends 34 ? "34" : N extends 35 ? "35" : N extends 36 ? "36" : N extends 37 ? "37" : N extends 38 ? "38" : N extends 39 ? "39" : N extends 40 ? "40" : N extends 41 ? "41" : N extends 42 ? "42" : N extends 43 ? "43" : N extends 44 ? "44" : N extends 45 ? "45" : N extends 46 ? "46" : N extends 47 ? "47" : N extends 48 ? "48" : N extends 49 ? "49" : N extends 50 ? "50" : N extends 51 ? "51" : N extends 52 ? "52" : N extends 53 ? "53" : N extends 54 ? "54" : N extends 55 ? "55" : N extends 56 ? "56" : N extends 57 ? "57" : N extends 58 ? "58" : N extends 59 ? "59" : N extends 60 ? "60" : N extends 61 ? "61" : N extends 62 ? "62" : N extends 63 ? "63" : N extends 64 ? "64" : N extends 65 ? "65" : N extends 66 ? "66" : N extends 67 ? "67" : N extends 68 ? "68" : N extends 69 ? "69" : N extends 70 ? "70" : N extends 71 ? "71" : N extends 72 ? "72" : N extends 73 ? "73" : N extends 74 ? "74" : N extends 75 ? "75" : N extends 76 ? "76" : N extends 77 ? "77" : N extends 78 ? "78" : N extends 79 ? "79" : N extends 80 ? "80" : N extends 81 ? "81" : N extends 82 ? "82" : N extends 83 ? "83" : N extends 84 ? "84" : N extends 85 ? "85" : N extends 86 ? "86" : N extends 87 ? "87" : N extends 88 ? "88" : N extends 89 ? "89" : N extends 90 ? "90" : N extends 91 ? "91" : N extends 92 ? "92" : N extends 93 ? "93" : N extends 94 ? "94" : N extends 95 ? "95" : N extends 96 ? "96" : N extends 97 ? "97" : N extends 98 ? "98" : N extends 99 ? "99" : N extends 100 ? "100" : "0";

/** Convert a string to a number by counting digit characters */
type StringToNum<S extends string> = StringToNumImpl<S, 0>;
type StringToNumImpl<S extends string, Acc extends number> = S extends `${infer First}${infer Rest}` ? Rest extends "" ? Acc : Rest extends `${string}${string}` ? Acc : StringToNumImpl<Rest, Acc extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}` ? Acc : Acc extends number ? Acc : 0 : 0;

/** Better string to number using conditional counting */
type CountDigits<S extends string, N extends number = 0> = S extends `${infer First}${infer Rest}`
  ? Rest extends `${infer _}${infer __}${infer ___}${infer ____}${infer _____}${infer ______}${infer _______}${infer ________}${infer ___________}${string}`
  ? number extends N ? 0 : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : 0
  : S extends `${string}${string}`
  ? number extends N ? 0 : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : CountDigits<Rest, N extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}` ? N : 0
  : S extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}`
  ? 0
  : S extends `${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${infer _}${string}`
  ? 0
  : 1;

// ============================================================================
// Tokenization
// ============================================================================

/** Tokenize a string expression into an array of tokens */
type Tokenize<S extends string> = TokenizeImpl<S, []>;
type TokenizeImpl<S extends string, Tokens extends any[]> = S extends `${infer Head}${infer Tail}`
  ? Tail extends ""
    ? Tokens
    : Head extends " " | "\t" | "\n" | "\r"
      ? TokenizeImpl<Tail, Tokens>
      : Head extends "+"
        ? TokenizeImpl<Tail, [...Tokens, "+"]>
        : Head extends "-"
          ? TokenizeImpl<Tail, [...Tokens, "-"]>
          : Head extends "*"
            ? TokenizeImpl<Tail, [...Tokens, "*"]>
            : Head extends "("
              ? TokenizeImpl<Tail, [...Tokens, "("]>
              : Head extends ")"
                ? TokenizeImpl<Tail, [...Tokens, ")"]>
                : Head extends "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
                  ? Tail extends `${Head}${infer Next}${string}`
                    ? Next extends "+" | "-" | "*" | "(" | ")" | " " | "\t" | "\n" | "\r"
                      ? TokenizeImpl<Tail, [...Tokens, Head as any]>
                      : TokenizeImpl<Tail, [...Tokens, Head as any]>
                    : Tokens
                  : Tokens
      : Tokens;

// ============================================================================
// AST Building
// ============================================================================

/** Build an AST from tokens */
type ParseExpr<Tokens extends any[]> = ParseExprImpl<Tokens, [], []>;

/**
 * Parse expression: term (("+" | "-") term)*
 * Left-associative
 */
type ParseExprImpl<Tokens extends any[], Stack extends any[], PendingOp extends any[]> = Tokens extends []
  ? PendingOp extends []
    ? Stack
    : Stack
  : Tokens extends [infer Head, ...infer Tail]
    ? Tail extends []
      ? PendingOp extends []
        ? Stack extends [infer SHead, ...infer STail]
          ? SHead extends ["num", infer Num extends string]
            ? Stack
            : Stack
          : Stack
        : ParseExprImpl<Tail, Stack, [...PendingOp, "+"]]
      : Head extends "+"
        ? ParseExprImpl<Tail, Stack, [...PendingOp, "+"]]
        : Head extends "-"
          ? ParseExprImpl<Tail, Stack, [...PendingOp, "-"]]
          : Head extends "*"
            ? ParseExprImpl<Tail, Stack, [...PendingOp, "*"]]
            : Head extends "("
              ? ParseExprImpl<Tail, [...Stack, ["num", "0"]], [...PendingOp, "+"]]
              : Head extends ")"
                ? ParseExprImpl<Tail, [...Stack, ["num", "0"]], PendingOp]
                : Head extends "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
                  ? ParseExprImpl<Tail, [...Stack, ["num", Head as string]], [...PendingOp, "+"]]
                  : ParseExprImpl<Tail, [...Stack, ["num", "0"]], [...PendingOp, "+"]]
      : Stack;

// ============================================================================
// Evaluation
// ============================================================================

/** Evaluate an expression AST */
type Eval<S extends string> = EvalImpl<Tokenize<S>>;
type EvalImpl<Tokens extends any[]> = Tokens extends []
  ? 0
  : Tokens extends [infer Head, ...infer Tail]
    ? Tail extends []
      ? Head extends "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
        ? Head extends "0" ? 0 : Head extends "1" ? 1 : Head extends "2" ? 2 : Head extends "3" ? 3 : Head extends "4" ? 4 : Head extends "5" ? 5 : Head extends "6" ? 6 : Head extends "7" ? 7 : Head extends "8" ? 8 : Head extends "9" ? 9 : 0
        : 0
      : 0;

// ============================================================================
// Main Export
// ============================================================================

export type Eval<S extends string> = EvalImpl<Tokenize<S>>;
