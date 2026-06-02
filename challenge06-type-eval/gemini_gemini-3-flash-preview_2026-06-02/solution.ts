
export type Digit = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9';

export type Tokenize<S extends string, Tokens extends string[] = []> = 
  S extends `${infer C}${infer Rest}`
    ? C extends ' ' | '\n' | '\t' | '\r' ? Tokenize<Rest, Tokens>
    : C extends '+' | '-' | '*' | '(' | ')' ? Tokenize<Rest, [...Tokens, C]>
    : C extends Digit ? ConsumeNumber<Rest, C, Tokens>
    : never
    : Tokens;

type ConsumeNumber<S extends string, Acc extends string, Tokens extends string[]> = 
  S extends `${infer C}${infer Rest}`
    ? C extends Digit ? ConsumeNumber<Rest, `${Acc}${C}`, Tokens>
    : Tokenize<S, [...Tokens, Acc]>
    : [...Tokens, Acc];

export type StringToNumber<S extends string> = S extends `${infer N extends number}` ? N : never;

export type BuildTuple<L extends number, T extends any[] = []> = T["length"] extends L
  ? T
  : BuildTuple<L, [...T, any]>;

export type Add<A extends number, B extends number> = 
  [...BuildTuple<A>, ...BuildTuple<B>]['length'] & number;

export type Sub<A extends number, B extends number> = 
  BuildTuple<A> extends [...BuildTuple<B>, ...infer R] ? R['length'] & number : never;

export type Mul<A extends number, B extends number, Acc extends any[] = []> = 
  B extends 0 ? Acc['length'] & number :
  Mul<A, Sub<B, 1>, [...Acc, ...BuildTuple<A>]>;

export type ParseResult<V, R> = { value: V, rest: R };

export type ParseExpr<Tokens extends string[]> = 
  ParseTerm<Tokens> extends { value: infer V, rest: infer R }
    ? R extends string[] ? ParseExprLoop<V & number, R> : never
    : never;

type ParseExprLoop<Acc extends number, Tokens extends string[]> = 
  Tokens extends ['+', ...infer Rest]
    ? Rest extends string[] 
      ? ParseTerm<Rest> extends { value: infer V, rest: infer R2 }
        ? R2 extends string[] ? ParseExprLoop<Add<Acc, V & number>, R2> : never
        : never
      : never
    : Tokens extends ['-', ...infer Rest]
      ? Rest extends string[] 
        ? ParseTerm<Rest> extends { value: infer V, rest: infer R2 }
          ? R2 extends string[] ? ParseExprLoop<Sub<Acc, V & number>, R2> : never
          : never
        : never
      : ParseResult<Acc, Tokens>;

type ParseTerm<Tokens extends string[]> = 
  ParseFactor<Tokens> extends { value: infer V, rest: infer R }
    ? R extends string[] ? ParseTermLoop<V & number, R> : never
    : never;

type ParseTermLoop<Acc extends number, Tokens extends string[]> = 
  Tokens extends ['*', ...infer Rest]
    ? Rest extends string[] 
      ? ParseFactor<Rest> extends { value: infer V, rest: infer R2 }
        ? R2 extends string[] ? ParseTermLoop<Mul<Acc, V & number>, R2> : never
        : never
      : never
    : ParseResult<Acc, Tokens>;

type ParseFactor<Tokens extends string[]> = 
  Tokens extends ['(', ...infer Rest]
    ? Rest extends string[] 
      ? ParseExpr<Rest> extends { value: infer V, rest: infer R2 }
        ? R2 extends [')', ...infer R3]
          ? R3 extends string[] ? ParseResult<V, R3> : never
          : never
        : never
      : never
    : Tokens extends [infer N, ...infer Rest]
      ? N extends string 
        ? StringToNumber<N> extends infer Num 
          ? Num extends number ? (Rest extends string[] ? ParseResult<Num, Rest> : never) : never
          : never
        : never
      : never;

export type Eval<S extends string> = 
  ParseExpr<Tokenize<S>> extends { value: infer V, rest: infer R }
    ? R extends [] ? V : never
    : never;
