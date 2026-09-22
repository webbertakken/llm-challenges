/**
 * Type-level normal-order reducer for the closed untyped lambda calculus.
 * Named syntax is parsed, converted to de Bruijn indices, then reduced
 * leftmost-outermost so an unused argument is discarded without being entered.
 */

type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j"
  | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t"
  | "u" | "v" | "w" | "x" | "y" | "z";

type Space = " " | "\t" | "\n" | "\r";

type SuccOf = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
  41, 42, 43, 44, 45, 46, 47, 48, 49, 50,
  51, 52, 53, 54, 55, 56, 57, 58, 59, 60,
  61, 62, 63, 64,
];

type PredOf = [
  0,
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
  40, 41, 42, 43, 44, 45, 46, 47, 48, 49,
  50, 51, 52, 53, 54, 55, 56, 57, 58, 59,
  60, 61, 62, 63,
];

type Succ<N extends number> = N extends keyof SuccOf ? SuccOf[N] : never;
type Pred<N extends number> = N extends keyof PredOf ? PredOf[N] : never;

type Cmp<A extends number, B extends number> = A extends B
  ? "eq"
  : A extends 0
    ? "lt"
    : B extends 0
      ? "gt"
      : Cmp<Pred<A>, Pred<B>>;

type Greater<A extends number, B extends number> = Cmp<A, B> extends "gt" ? true : false;

type Tokenize<S extends string, Acc extends string[] = []> = S extends `${infer Char}${infer Rest}`
  ? Char extends Space
    ? Tokenize<Rest, Acc>
    : Char extends "\\" | "." | "(" | ")" | Letter
      ? Tokenize<Rest, [...Acc, Char]>
      : never
  : Acc;

type Parse<Tokens extends string[]> = ParseApp<Tokens> extends [infer Term, infer Rest extends string[]]
  ? Rest["length"] extends 0
    ? Term
    : never
  : never;

type ParseApp<Tokens extends string[]> = ParseAtom<Tokens> extends [infer Fun, infer Rest extends string[]]
  ? ParseAppRest<Fun, Rest>
  : never;

type ParseAppRest<Fun, Tokens extends string[]> = Tokens extends [] | [")", ...string[]]
  ? [Fun, Tokens]
  : ParseAtom<Tokens> extends [infer Arg, infer Rest extends string[]]
    ? ParseAppRest<["a", Fun, Arg], Rest>
    : [Fun, Tokens];

type ParseAtom<Tokens extends string[]> = Tokens extends [
  "\\",
  infer Name extends Letter,
  ".",
  ...infer Rest extends string[],
]
  ? ParseApp<Rest> extends [infer Body, infer After extends string[]]
    ? [["l", Name, Body], After]
    : never
  : Tokens extends ["(", ...infer Rest extends string[]]
    ? ParseApp<Rest> extends [infer Inner, infer After extends string[]]
      ? After extends [")", ...infer Tail extends string[]]
        ? [Inner, Tail]
        : never
      : never
    : Tokens extends [infer Name extends Letter, ...infer Rest extends string[]]
      ? [["v", Name], Rest]
      : never;

type Find<Name extends string, Env extends string[], Index extends number = 0> = Env extends [
  infer Head,
  ...infer Tail extends string[],
]
  ? Head extends Name
    ? Index
    : Find<Name, Tail, Succ<Index>>
  : never;

type DeBruijn<Term, Env extends string[] = []> = Term extends ["v", infer Name extends string]
  ? ["v", Find<Name, Env>]
  : Term extends ["l", infer Param extends string, infer Body]
    ? ["l", DeBruijn<Body, [Param, ...Env]>]
    : Term extends ["a", infer Fun, infer Arg]
      ? ["a", DeBruijn<Fun, Env>, DeBruijn<Arg, Env>]
      : never;

type Shift<Term, Cut extends number> = Term extends ["v", infer Index extends number]
  ? Greater<Index, Cut> extends true
    ? ["v", Succ<Index>]
    : Index extends Cut
      ? ["v", Succ<Index>]
      : Term
  : Term extends ["l", infer Body]
    ? ["l", Shift<Body, Succ<Cut>>]
    : Term extends ["a", infer Fun, infer Arg]
      ? ["a", Shift<Fun, Cut>, Shift<Arg, Cut>]
      : never;

type Subst<Term, Level extends number, Value> = Term extends ["v", infer Index extends number]
  ? Index extends Level
    ? Value
    : Greater<Index, Level> extends true
      ? ["v", Pred<Index>]
      : Term
  : Term extends ["l", infer Body]
    ? ["l", Subst<Body, Succ<Level>, Shift<Value, 0>>]
    : Term extends ["a", infer Fun, infer Arg]
      ? ["a", Subst<Fun, Level, Value>, Subst<Arg, Level, Value>]
      : never;

type Step<Term> = Term extends ["a", infer Fun, infer Arg]
  ? Fun extends ["l", infer Body]
    ? ["go", Subst<Body, 0, Arg>]
    : Step<Fun> extends ["go", infer NextFun]
      ? ["go", ["a", NextFun, Arg]]
      : Step<Arg> extends ["go", infer NextArg]
        ? ["go", ["a", Fun, NextArg]]
        : ["stop"]
  : Term extends ["l", infer Body]
    ? Step<Body> extends ["go", infer NextBody]
      ? ["go", ["l", NextBody]]
      : ["stop"]
    : ["stop"];

type Render<Term> = Term extends ["v", infer Index extends number]
  ? `${Index}`
  : Term extends ["l", infer Body]
    ? `\\.${Render<Body>}`
    : Term extends ["a", infer Fun, infer Arg]
      ? `(${Render<Fun>} ${Render<Arg>})`
      : never;

type Drive<Term, Fuel extends unknown[]> = Fuel extends [unknown, ...infer Rest]
  ? Step<Term> extends ["go", infer Next]
    ? Drive<Next, Rest>
    : Render<Term>
  : "DIVERGE";

type Fuel = [
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
  0, 0, 0, 0, 0, 0, 0, 0,
];

export type Normalize<S extends string> = Drive<DeBruijn<Parse<Tokenize<S>>>, Fuel>;
