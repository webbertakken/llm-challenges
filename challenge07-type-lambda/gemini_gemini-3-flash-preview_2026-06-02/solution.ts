// === UTILS ===
type Trim<S extends string> = S extends ` ${infer R}` ? Trim<R> : S extends `\n${infer R}` ? Trim<R> : S;
type IsLetter<S extends string> = S extends "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z" ? true : false;

// === TOKENIZER ===
type Tokenize<S extends string> = 
  Trim<S> extends "" ? [] :
  Trim<S> extends `\\${infer R}` ? ["\\", ...Tokenize<R>] :
  Trim<S> extends `.${infer R}` ? [".", ...Tokenize<R>] :
  Trim<S> extends `(${infer R}` ? ["(", ...Tokenize<R>] :
  Trim<S> extends `)${infer R}` ? [")", ...Tokenize<R>] :
  Trim<S> extends `${infer C}${infer R}` ? 
    IsLetter<C> extends true ? [C, ...Tokenize<R>] :
    Tokenize<R> :
  [];

// === AST ===
type AST = { type: "var"; index: number } | { type: "abs"; body: AST } | { type: "app"; func: AST; arg: AST };

// === PARSER ===
type FindVar<V extends string, Scope extends string[]> = 
  Scope extends [infer Head, ...infer Tail] ?
    (Head extends V ? 0 :
    Tail extends string[] ? 
      (FindVar<V, Tail> extends number ? 
        Add1<FindVar<V, Tail>> : 
        never) : 
      never) :
    never;

type Add1<N extends number> = [any, ...BuildTuple<N>]["length"] & number;
type BuildTuple<N extends number, T extends any[] = []> = T["length"] extends N ? T : BuildTuple<N, [any, ...T]>;

type ParseAtom<Tokens extends string[], Scope extends string[]> = 
  Tokens extends ["(", ...infer Rest] ?
    (Rest extends string[] ? (ParseTerm<Rest, Scope> extends [infer Term, [")", ...infer Rest2]] ? [Term, Rest2] : never) : never) :
  Tokens extends ["\\", infer V, ".", ...infer Rest] ?
    (V extends string ? Rest extends string[] ?
      (ParseTerm<Rest, [V, ...Scope]> extends [infer Body, infer Rest2] ? 
        [{ type: "abs"; body: Body }, Rest2] : never) : never : never) :
  Tokens extends [infer V, ...infer Rest] ?
    (V extends string ? (IsLetter<V> extends true ? 
      [{ type: "var"; index: FindVar<V, Scope> }, Rest] : never) : never) :
  never;

type ParseApp<Tokens extends string[], Scope extends string[], CurrentAST = never> = 
  ParseAtom<Tokens, Scope> extends [infer NextAST, infer Rest] ?
    (Rest extends string[] ? 
      ([CurrentAST] extends [never] ? 
        ParseApp<Rest, Scope, NextAST> :
        ParseApp<Rest, Scope, { type: "app"; func: CurrentAST; arg: NextAST }>) :
    [[CurrentAST] extends [never] ? NextAST : { type: "app"; func: CurrentAST; arg: NextAST }, Rest]) :
  [CurrentAST, Tokens];

type ParseTerm<Tokens extends string[], Scope extends string[]> = ParseApp<Tokens, Scope>;

// === SHIFTING & SUBSTITUTION ===
type Shift<T extends AST, D extends number, C extends number = 0> = 
  T extends { type: "var"; index: infer I } ? 
    (I extends number ? (CompareGE<I, C> extends true ? { type: "var"; index: Add<I, D> } : T) : never) :
  T extends { type: "abs"; body: infer B } ? 
    (B extends AST ? { type: "abs"; body: Shift<B, D, (C extends 0 ? 1 : Add1<C>)> } : never) :
  T extends { type: "app"; func: infer F; arg: infer A } ? 
    (F extends AST ? A extends AST ? { type: "app"; func: Shift<F, D, C>; arg: Shift<A, D, C> } : never : never) :
  never;

type Substitute<T extends AST, J extends number, S extends AST> = 
  T extends { type: "var"; index: infer I } ? 
    (I extends J ? S : T) :
  T extends { type: "abs"; body: infer B } ? 
    (B extends AST ? { type: "abs"; body: Substitute<B, (J extends 0 ? 1 : Add1<J>), Shift<S, 1>> } : never) :
  T extends { type: "app"; func: infer F; arg: infer A } ? 
    (F extends AST ? A extends AST ? { type: "app"; func: Substitute<F, J, S>; arg: Substitute<A, J, S> } : never : never) :
  never;

type CompareGE<N1 extends number, N2 extends number> = 
  BuildTuple<N1> extends [...BuildTuple<N2>, ...any[]] ? true : false;
type Add<N1 extends number, N2 extends number> = [...BuildTuple<N1>, ...BuildTuple<N2>]["length"] & number;
type Sub1<N extends number> = BuildTuple<N> extends [any, ...infer T] ? T["length"] : 0;

// === REDUCTION (NORMAL ORDER) ===
type ShiftNeg1<T extends AST, C extends number = 0> = 
  T extends { type: "var"; index: infer I } ? 
    (I extends number ? (CompareGE<I, C> extends true ? { type: "var"; index: Sub1<I> } : T) : never) :
  T extends { type: "abs"; body: infer B } ? 
    (B extends AST ? { type: "abs"; body: ShiftNeg1<B, (C extends 0 ? 1 : Add1<C>)> } : never) :
  T extends { type: "app"; func: infer F; arg: infer A } ? 
    (F extends AST ? A extends AST ? { type: "app"; func: ShiftNeg1<F, C>; arg: ShiftNeg1<A, C> } : never : never) :
  never;

type BetaReduce<B extends AST, A extends AST> = ShiftNeg1<Substitute<B, 0, Shift<A, 1>>>;

type StepNO<T extends AST> = 
  T extends { type: "app"; func: { type: "abs"; body: infer B }; arg: infer A } ?
    (B extends AST ? A extends AST ? BetaReduce<B, A> : never : never) :
  T extends { type: "app"; func: infer F; arg: infer A } ?
    (F extends AST ? (StepNO<F> extends infer F2 ? 
      ([F2] extends [never] ? (A extends AST ? (StepNO<A> extends infer A2 ? 
        ([A2] extends [never] ? never : { type: "app"; func: F; arg: A2 }) : never) : never) : 
        { type: "app"; func: F2; arg: A }) : never) : never) :
  T extends { type: "abs"; body: infer B } ?
    (B extends AST ? (StepNO<B> extends infer B2 ? 
      ([B2] extends [never] ? never : { type: "abs"; body: B2 }) : never) : never) :
  never;

type NormalizeAST<T extends AST, Steps extends any[]> = 
  Steps["length"] extends 20 ? "DIVERGE" :
  (StepNO<T> extends infer Next ?
    ([Next] extends [never] ? T :
    (Next extends AST ? NormalizeAST<Next, [any, ...Steps]> :
    "DIVERGE")) :
  "DIVERGE");

// === RENDERING ===
type Render<T extends AST | "DIVERGE"> = 
  T extends "DIVERGE" ? "DIVERGE" :
  T extends { type: "var"; index: infer I } ? `${I & number}` :
  T extends { type: "abs"; body: infer B } ? (B extends AST ? `\\.${Render<B>}` : never) :
  T extends { type: "app"; func: infer F; arg: infer A } ? (F extends AST ? A extends AST ? `(${Render<F>} ${Render<A>})` : never : never) :
  never;

// === MAIN ===
export type Normalize<S extends string> = 
  Tokenize<S> extends infer Tokens ?
    (Tokens extends string[] ?
      (ParseTerm<Tokens, []> extends [infer T, any] ?
        (T extends AST ? Render<NormalizeAST<T, []>> : never) :
      never) :
    never) :
  never;
