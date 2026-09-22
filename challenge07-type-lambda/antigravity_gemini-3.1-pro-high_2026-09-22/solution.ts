export type Whitespace = " " | "\n" | "\r" | "\t";

export type Lex<S extends string, Acc extends string[] = []> = 
  S extends `${infer C}${infer Rest}`
    ? C extends Whitespace 
      ? Lex<Rest, Acc>
      : Lex<Rest, [...Acc, C]>
    : Acc;

export type IsTerm<T> = T extends { type: "var" | "abs" | "app" } ? true : false;

export type ReduceApp<Stack extends any[]> =
  Stack extends [...infer Rest, infer T1, infer T2]
    ? IsTerm<T1> extends true
      ? IsTerm<T2> extends true
        ? ReduceApp<[...Rest, { type: "app", left: T1, right: T2 }]>
        : Stack
      : Stack
    : Stack;

export type ReduceAbs<Stack extends any[]> =
  Stack extends [...infer Rest, { type: "abs-pending", param: infer P }, infer T]
    ? IsTerm<T> extends true
      ? ReduceAbs<[...Rest, { type: "abs", param: P, body: T }]>
      : Stack
    : Stack;

export type ParseLoop<Tokens extends string[], Stack extends any[]> =
  Tokens extends [infer Tok, ...infer Rest extends string[]]
    ? Tok extends "\\"
      ? Rest extends [infer Var, ".", ...infer Rest2 extends string[]]
        ? ParseLoop<Rest2, [...Stack, { type: "abs-pending", param: Var }]>
        : never
      : Tok extends "("
        ? ParseLoop<Rest, [...Stack, "("]>
        : Tok extends ")"
          ? ReduceAbs<Stack> extends [...infer RestStack, "(", infer T]
            ? ParseLoop<Rest, ReduceApp<[...RestStack, T]>>
            : never
          : ParseLoop<Rest, ReduceApp<[...Stack, { type: "var", name: Tok }]>>
    : ReduceAbs<Stack> extends [infer Result] ? Result : never;

export type ParseTerm<S extends string> = ParseLoop<Lex<S>, []>;

export type TupleOf<N extends number, Acc extends any[] = []> = Acc['length'] extends N ? Acc : TupleOf<N, [...Acc, 1]>;
export type Add<A extends number, B extends number> = [...TupleOf<A>, ...TupleOf<B>]['length'] & number;
export type Sub<A extends number, B extends number> = TupleOf<A> extends [...TupleOf<B>, ...infer Rest] ? Rest['length'] & number : never;
export type Gte<A extends number, B extends number> = TupleOf<A> extends [...TupleOf<B>, ...any[]] ? true : false;

export type IndexOf<N, Env extends string[], Count extends any[] = []> = 
  Env extends [infer First, ...infer Rest extends string[]]
    ? First extends N ? Count["length"] & number : IndexOf<N, Rest, [...Count, 1]>
    : never;

export type ToDeBruijn<T, Env extends string[]> = 
  T extends { type: "var", name: infer N }
    ? { type: "var", index: IndexOf<N, Env> }
    : T extends { type: "abs", param: infer P extends string, body: infer B }
      ? { type: "abs", body: ToDeBruijn<B, [P, ...Env]> }
      : T extends { type: "app", left: infer L, right: infer R }
        ? { type: "app", left: ToDeBruijn<L, Env>, right: ToDeBruijn<R, Env> }
        : never;

export type Shift<T, By extends number, Depth extends any[] = []> = 
  By extends 0 ? T :
  T extends { type: "var", index: infer I extends number }
    ? Gte<I, Depth["length"]> extends true 
      ? { type: "var", index: Add<I, By> }
      : T
    : T extends { type: "abs", body: infer B }
      ? { type: "abs", body: Shift<B, By, [...Depth, 1]> }
      : T extends { type: "app", left: infer L, right: infer R }
        ? { type: "app", left: Shift<L, By, Depth>, right: Shift<R, By, Depth> }
        : never;

export type Subst<T, Arg, Depth extends any[] = []> = 
  T extends { type: "var", index: infer I extends number }
    ? I extends Depth["length"]
      ? Shift<Arg, Depth["length"]>
      : Gte<I, Depth["length"]> extends true
        ? { type: "var", index: Sub<I, 1> }
        : T
    : T extends { type: "abs", body: infer B }
      ? { type: "abs", body: Subst<B, Arg, [...Depth, 1]> }
      : T extends { type: "app", left: infer L, right: infer R }
        ? { type: "app", left: Subst<L, Arg, Depth>, right: Subst<R, Arg, Depth> }
        : never;

export type Step<T> = 
  T extends { type: "app", left: { type: "abs", body: infer B }, right: infer R }
    ? { reduced: true, term: Subst<B, R> }
    : T extends { type: "app", left: infer L, right: infer R }
      ? Step<L> extends { reduced: true, term: infer L2 }
        ? { reduced: true, term: { type: "app", left: L2, right: R } }
        : Step<R> extends { reduced: true, term: infer R2 }
          ? { reduced: true, term: { type: "app", left: L, right: R2 } }
          : { reduced: false, term: T }
      : T extends { type: "abs", body: infer B }
        ? Step<B> extends { reduced: true, term: infer B2 }
          ? { reduced: true, term: { type: "abs", body: B2 } }
          : { reduced: false, term: T }
        : { reduced: false, term: T };

export type Tail<T extends any[]> = T extends [any, ...infer Rest] ? Rest : [];

export type EvalLoop<T, Fuel extends any[]> = 
  Fuel extends [] ? "DIVERGE" :
  Step<T> extends { reduced: true, term: infer Next }
    ? EvalLoop<Next, Tail<Fuel>>
    : Render<T>;

export type Render<T> = 
  T extends { type: "var", index: infer I extends number } ? `${I}`
  : T extends { type: "abs", body: infer B } ? `\\.${Render<B>}`
  : T extends { type: "app", left: infer L, right: infer R } ? `(${Render<L>} ${Render<R>})`
  : never;

export type Normalize<S extends string> = EvalLoop<ToDeBruijn<ParseTerm<S>, []>, TupleOf<30>>;
