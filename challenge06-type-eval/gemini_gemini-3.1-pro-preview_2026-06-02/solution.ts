export type DigitToTuple<D extends string> =
  D extends "0" ? [] :
  D extends "1" ? [1] :
  D extends "2" ? [1, 1] :
  D extends "3" ? [1, 1, 1] :
  D extends "4" ? [1, 1, 1, 1] :
  D extends "5" ? [1, 1, 1, 1, 1] :
  D extends "6" ? [1, 1, 1, 1, 1, 1] :
  D extends "7" ? [1, 1, 1, 1, 1, 1, 1] :
  D extends "8" ? [1, 1, 1, 1, 1, 1, 1, 1] :
  D extends "9" ? [1, 1, 1, 1, 1, 1, 1, 1, 1] : [];

export type Mul10<T extends any[]> = [...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T, ...T];

export type StringToTuple<S extends string, Acc extends any[] = []> =
  S extends `${infer D}${infer Rest}`
    ? StringToTuple<Rest, [...Mul10<Acc>, ...DigitToTuple<D>]>
    : Acc;

export type Add<A extends any[], B extends any[]> = [...A, ...B];
export type Sub<A extends any[], B extends any[]> = A extends [...B, ...infer R] ? R : never;
export type Mul<A extends any[], B extends any[], Acc extends any[] = []> =
  B extends [any, ...infer Rest] ? Mul<A, Rest, [...Acc, ...A]> : Acc;

export type StripWhitespace<S extends string> = 
  S extends `${infer L} ${infer R}` ? StripWhitespace<`${L}${R}`> :
  S extends `${infer L}\n${infer R}` ? StripWhitespace<`${L}${R}`> :
  S extends `${infer L}\t${infer R}` ? StripWhitespace<`${L}${R}`> : S;

export type Tokenize<S extends string, Acc extends string = "", Tokens extends string[] = []> =
  S extends `${infer Char}${infer Rest}`
    ? Char extends "+" | "-" | "*" | "(" | ")"
      ? Acc extends ""
        ? Tokenize<Rest, "", [...Tokens, Char]>
        : Tokenize<Rest, "", [...Tokens, Acc, Char]>
      : Tokenize<Rest, `${Acc}${Char}`, Tokens>
    : Acc extends "" ? Tokens : [...Tokens, Acc];

export type ParseExpr<Tokens extends string[]> =
  ParseTerm<Tokens> extends [infer LeftResult extends any[], infer Rest1 extends string[]]
    ? ParseExprTail<LeftResult, Rest1>
    : never;

export type ParseExprTail<Left extends any[], Tokens extends string[]> =
  Tokens extends ["+", ...infer Rest extends string[]]
    ? (ParseTerm<Rest> extends [infer Right extends any[], infer Rest2 extends string[]]
        ? ParseExprTail<Add<Left, Right>, Rest2>
        : never)
    : Tokens extends ["-", ...infer Rest extends string[]]
      ? (ParseTerm<Rest> extends [infer Right extends any[], infer Rest2 extends string[]]
          ? ParseExprTail<Sub<Left, Right>, Rest2>
          : never)
      : [Left, Tokens];

export type ParseTerm<Tokens extends string[]> =
  ParseFactor<Tokens> extends [infer LeftResult extends any[], infer Rest1 extends string[]]
    ? ParseTermTail<LeftResult, Rest1>
    : never;

export type ParseTermTail<Left extends any[], Tokens extends string[]> =
  Tokens extends ["*", ...infer Rest extends string[]]
    ? (ParseFactor<Rest> extends [infer Right extends any[], infer Rest2 extends string[]]
        ? ParseTermTail<Mul<Left, Right>, Rest2>
        : never)
    : [Left, Tokens];

export type ParseFactor<Tokens extends string[]> =
  Tokens extends ["(", ...infer Rest extends string[]]
    ? (ParseExpr<Rest> extends [infer ExprResult extends any[], infer Rest2 extends string[]]
        ? Rest2 extends [")", ...infer Rest3 extends string[]]
          ? [ExprResult, Rest3]
          : never
        : never)
    : Tokens extends [infer NumStr extends string, ...infer Rest extends string[]]
      ? [StringToTuple<NumStr>, Rest]
      : never;

export type Eval<S extends string> =
  ParseExpr<Tokenize<StripWhitespace<S>>> extends [infer Result extends any[], []]
    ? Result["length"] & number
    : never;
