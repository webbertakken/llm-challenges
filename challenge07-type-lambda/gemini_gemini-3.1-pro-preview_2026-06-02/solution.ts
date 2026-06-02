// solution.ts
type Whitespace = ' ' | '\n' | '\t' | '\r';

type Tokenize<S extends string, Acc extends any[] = []> = 
  S extends `${Whitespace}${infer Rest}` ? Tokenize<Rest, Acc> :
  S extends `\\${infer Rest}` ? Tokenize<Rest, [...Acc, '\\']> :
  S extends `.${infer Rest}` ? Tokenize<Rest, [...Acc, '.']> :
  S extends `(${infer Rest}` ? Tokenize<Rest, [...Acc, '(']> :
  S extends `)${infer Rest}` ? Tokenize<Rest, [...Acc, ')']> :
  S extends `${infer C}${infer Rest}` ? Tokenize<Rest, [...Acc, C]> :
  Acc;

type ASTVar<N extends string> = { type: 'Var', name: N };
type ASTAbs<P extends string, B> = { type: 'Abs', param: P, body: B };
type ASTApp<L, R> = { type: 'App', left: L, right: R };

type ParseAtom<T extends any[]> =
  T extends ['\\', infer P extends string, '.', ...infer Rest]
    ? (
        ParseTerm<Rest> extends [infer Body, infer Rest2]
          ? [ASTAbs<P, Body>, Rest2]
          : never
      )
    : T extends ['(', ...infer Rest]
      ? (
          ParseTerm<Rest> extends [infer Inner, infer Rest2]
            ? Rest2 extends [')', ...infer Rest3]
              ? [Inner, Rest3]
              : never
            : never
        )
      : T extends [infer V extends string, ...infer Rest]
        ? [ASTVar<V>, Rest]
        : never;

type ParseAppLoop<Left, T extends any[]> =
  T extends [] ? [Left, T] :
  T extends [')', ...any] ? [Left, T] :
  ParseAtom<T> extends [infer Right, infer Rest extends any[]]
    ? ParseAppLoop<ASTApp<Left, Right>, Rest>
    : [Left, T];

type ParseApp<T extends any[]> =
  ParseAtom<T> extends [infer Left, infer Rest extends any[]]
    ? ParseAppLoop<Left, Rest>
    : never;

type ParseTerm<T extends any[]> = ParseApp<T>;

type Parse<S extends string> = 
  ParseTerm<Tokenize<S>> extends [infer Ast, []] ? Ast : never;

type Nat = any[];
type DBVar<I extends Nat> = { type: 'DBVar', index: I };
type DBAbs<B> = { type: 'DBAbs', body: B };
type DBApp<L, R> = { type: 'DBApp', left: L, right: R };

type Succ<N extends Nat> = [0, ...N];

type IndexOf<Env extends any[], V extends string, I extends Nat = []> =
  Env extends [infer First, ...infer Rest]
    ? First extends V ? I : IndexOf<Rest, V, Succ<I>>
    : never;

type ToDB<Ast, Env extends any[] = []> =
  Ast extends ASTVar<infer N>
    ? DBVar<IndexOf<Env, N>>
    : Ast extends ASTAbs<infer P, infer B>
      ? DBAbs<ToDB<B, [P, ...Env]>>
      : Ast extends ASTApp<infer L, infer R>
        ? DBApp<ToDB<L, Env>, ToDB<R, Env>>
        : never;

type Lt<A extends Nat, B extends Nat> =
  A extends [] ? (B extends [] ? false : true) :
  A extends [any, ...infer RestA] ? (
    B extends [any, ...infer RestB] ? Lt<RestA, RestB> : false
  ) : false;

type Add<A extends Nat, B extends Nat> = [...A, ...B];

type Sub<A extends Nat, B extends Nat> =
  B extends [] ? A :
  A extends [any, ...infer RestA] ?
    B extends [any, ...infer RestB] ? Sub<RestA, RestB> : []
  : [];

type EqNat<A extends Nat, B extends Nat> = A['length'] extends B['length'] ? true : false;

type ShiftUp<D extends Nat, C extends Nat, T> =
  T extends DBVar<infer K>
    ? Lt<K, C> extends true ? T : DBVar<Add<K, D>>
    : T extends DBAbs<infer B>
      ? DBAbs<ShiftUp<D, Succ<C>, B>>
      : T extends DBApp<infer L, infer R>
        ? DBApp<ShiftUp<D, C, L>, ShiftUp<D, C, R>>
        : T;

type ShiftDown<C extends Nat, T> =
  T extends DBVar<infer K>
    ? Lt<K, C> extends true ? T : DBVar<Sub<K, [0]>>
    : T extends DBAbs<infer B>
      ? DBAbs<ShiftDown<Succ<C>, B>>
      : T extends DBApp<infer L, infer R>
        ? DBApp<ShiftDown<C, L>, ShiftDown<C, R>>
        : T;

type Subst<J extends Nat, S, T> =
  T extends DBVar<infer K>
    ? EqNat<K, J> extends true
      ? S
      : T
    : T extends DBAbs<infer B>
      ? DBAbs<Subst<Succ<J>, ShiftUp<[0], [], S>, B>>
      : T extends DBApp<infer L, infer R>
        ? DBApp<Subst<J, S, L>, Subst<J, S, R>>
        : T;

type ApplyBeta<AbsBody, Arg> =
  ShiftDown<[], Subst<[], ShiftUp<[0], [], Arg>, AbsBody>>;

type EvalStep<T> =
  T extends DBApp<infer L, infer R>
    ? (
        L extends DBAbs<infer Body>
          ? [ApplyBeta<Body, R>, true]
          : EvalStep<L> extends [infer LNext, true]
            ? [DBApp<LNext, R>, true]
            : EvalStep<R> extends [infer RNext, true]
              ? [DBApp<L, RNext>, true]
              : [T, false]
      )
    : T extends DBAbs<infer B>
      ? (
          EvalStep<B> extends [infer BNext, true]
            ? [DBAbs<BNext>, true]
            : [T, false]
        )
    : [T, false];

type N10<T extends any[] = []> = [...T, 0,0,0,0,0,0,0,0,0,0];
type N50<T extends any[] = []> = N10<N10<N10<N10<N10<T>>>>>;
type N100<T extends any[] = []> = N50<N50<T>>;
type N200<T extends any[] = []> = N100<N100<T>>;
type N400<T extends any[] = []> = N200<N200<T>>;
type Fuel = N400;

type Eval<T, F extends Nat> =
  F extends [] ? 'DIVERGE' :
  EvalStep<T> extends [infer Next, infer Stepped]
    ? Stepped extends true
      ? Eval<Next, Rest<F>>
      : T
    : never;

type Rest<A extends Nat> = A extends [any, ...infer R] ? R : [];

type NatToString<N extends Nat> = `${N['length']}`;

type Render<T> =
  T extends 'DIVERGE' ? 'DIVERGE' :
  T extends DBVar<infer K>
    ? NatToString<K>
    : T extends DBAbs<infer B>
      ? `\\.${Render<B>}`
      : T extends DBApp<infer L, infer R>
        ? `(${Render<L>} ${Render<R>})`
        : 'ERROR';

export type Normalize<S extends string> = Render<Eval<ToDB<Parse<S>>, Fuel>>;
