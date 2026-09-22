/**
 * Type-level untyped-lambda normaliser.
 *
 * Pipeline: parse named terms → de Bruijn → normal-order NF → print.
 * Beta is leftmost-outermost; Ω hits the step bound and becomes "DIVERGE".
 */

// ---------------------------------------------------------------------------
// Arithmetic (indices / cutoffs only — small numbers)
// ---------------------------------------------------------------------------

type Repeat<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Repeat<N, [...Acc, 0]>;

type Add<A extends number, B extends number> = [...Repeat<A>, ...Repeat<B>]["length"] extends infer N extends number
  ? N
  : never;

type Sub1<N extends number> = Repeat<N> extends [unknown, ...infer Rest]
  ? Rest["length"] extends infer M extends number
    ? M
    : never
  : never;

type Gte<A extends number, B extends number> = Repeat<A> extends [...Repeat<B>, ...unknown[]]
  ? true
  : false;

// ---------------------------------------------------------------------------
// Lexer helpers
// ---------------------------------------------------------------------------

type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j"
  | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t"
  | "u" | "v" | "w" | "x" | "y" | "z";

type Space = " " | "\t" | "\n" | "\r";

type Skip<S extends string> = S extends `${Space}${infer Rest}` ? Skip<Rest> : S;

type CanStartAtom<S extends string> = Skip<S> extends `${infer C}${string}`
  ? C extends Letter | "(" | "\\"
    ? true
    : false
  : false;

// ---------------------------------------------------------------------------
// Named AST
//   ["V", name]
//   ["L", name, body]
//   ["A", fn, arg]
// ---------------------------------------------------------------------------

type ParseAbs<S extends string> = Skip<S> extends `${infer V extends Letter}${infer Rest}`
  ? Skip<Rest> extends `.${infer BodySrc}`
    ? ParseTerm<BodySrc> extends [infer Body, infer After]
      ? [["L", V, Body], After]
      : never
    : never
  : never;

type ParseAtom<S extends string> = Skip<S> extends `(${infer Rest}`
  ? ParseTerm<Rest> extends [infer T, infer After]
    ? Skip<After & string> extends `)${infer Rest2}`
      ? [T, Rest2]
      : never
    : never
  : Skip<S> extends `\\${infer Rest}`
    ? ParseAbs<Rest>
    : Skip<S> extends `${infer V extends Letter}${infer Rest}`
      ? [["V", V], Rest]
      : never;

type ParseAppTail<Left, S extends string> = CanStartAtom<S> extends true
  ? ParseAtom<S> extends [infer Next, infer Rest]
    ? ParseAppTail<["A", Left, Next], Rest & string>
    : [Left, S]
  : [Left, S];

type ParseApp<S extends string> = ParseAtom<S> extends [infer First, infer Rest]
  ? ParseAppTail<First, Rest & string>
  : never;

type ParseTerm<S extends string> = ParseApp<S>;

// ---------------------------------------------------------------------------
// Named → de Bruijn (env string, innermost binder first)
//   ["V", index]
//   ["L", body]
//   ["A", fn, arg]
// ---------------------------------------------------------------------------

type IndexOf<Name extends string, Env extends string, Acc extends unknown[] = []> =
  Env extends `${infer H}${infer Tail}`
    ? H extends Name
      ? Acc["length"]
      : IndexOf<Name, Tail, [...Acc, 0]>
    : never;

type ToDB<T, Env extends string = ""> = T extends ["V", infer Name extends string]
  ? ["V", IndexOf<Name, Env>]
  : T extends ["L", infer Name extends string, infer Body]
    ? ["L", ToDB<Body, `${Name}${Env}`>]
    : T extends ["A", infer F, infer Arg]
      ? ["A", ToDB<F, Env>, ToDB<Arg, Env>]
      : never;

// ---------------------------------------------------------------------------
// Capture-avoiding substitution (combined shift-down)
// ---------------------------------------------------------------------------

type Shift<T, D extends number, C extends number = 0> = T extends ["V", infer I extends number]
  ? Gte<I, C> extends true
    ? ["V", Add<I, D>]
    : ["V", I]
  : T extends ["L", infer B]
    ? ["L", Shift<B, D, Add<C, 1>>]
    : T extends ["A", infer F, infer Arg]
      ? ["A", Shift<F, D, C>, Shift<Arg, D, C>]
      : never;

type Subst<T, Repl, Depth extends number = 0> = T extends ["V", infer I extends number]
  ? I extends Depth
    ? Shift<Repl, Depth>
    : Gte<I, Depth> extends true
      ? ["V", Sub1<I>]
      : ["V", I]
  : T extends ["L", infer B]
    ? ["L", Subst<B, Repl, Add<Depth, 1>>]
    : T extends ["A", infer F, infer Arg]
      ? ["A", Subst<F, Repl, Depth>, Subst<Arg, Repl, Depth>]
      : never;

// ---------------------------------------------------------------------------
// Normal-order reduction
// ---------------------------------------------------------------------------

type Z8 = [0, 0, 0, 0, 0, 0, 0, 0];
type Quad<T extends unknown[]> = [...T, ...T, ...T, ...T];
/** 128 beta steps — enough for small Church arithmetic; Ω is tail-recursive. */
type Fuel = Quad<Quad<Z8>>;

type Drop1<N extends unknown[]> = N extends [unknown, ...infer Rest] ? Rest : [];

type Whnf<T, N extends unknown[] = Fuel> = N extends []
  ? ["DIVERGE"]
  : T extends ["A", ["L", infer B], infer Arg]
    ? Whnf<Subst<B, Arg>, Drop1<N>>
    : T extends ["A", infer F, infer Arg]
      ? Whnf<F, N> extends infer F2
        ? F2 extends ["DIVERGE"]
          ? ["DIVERGE"]
          : F2 extends ["L", infer B]
            ? Whnf<Subst<B, Arg>, Drop1<N>>
            : ["A", F2, Arg]
        : never
      : T;

type Nf<T, N extends unknown[] = Fuel> = Whnf<T, N> extends infer W
  ? W extends ["DIVERGE"]
    ? ["DIVERGE"]
    : W extends ["L", infer B]
      ? Nf<B, N> extends infer NB
        ? NB extends ["DIVERGE"]
          ? ["DIVERGE"]
          : ["L", NB]
        : never
      : W extends ["A", infer F, infer Arg]
        ? Nf<F, N> extends infer NF
          ? Nf<Arg, N> extends infer NA
            ? NF extends ["DIVERGE"]
              ? ["DIVERGE"]
              : NA extends ["DIVERGE"]
                ? ["DIVERGE"]
                : ["A", NF, NA]
            : never
          : never
        : W
  : never;

// ---------------------------------------------------------------------------
// Print canonical de Bruijn
// ---------------------------------------------------------------------------

type Render<T> = T extends ["V", infer I extends number]
  ? `${I}`
  : T extends ["L", infer B]
    ? `\\.${Render<B>}`
    : T extends ["A", infer F, infer Arg]
      ? `(${Render<F>} ${Render<Arg>})`
      : never;

/**
 * Beta-normal form of a closed named lambda term, printed in canonical
 * de Bruijn form. Diverging terms (within the step bound) yield "DIVERGE".
 */
export type Normalize<S extends string> = ParseTerm<S> extends [infer T, infer Rest]
  ? Skip<Rest & string> extends ""
    ? Nf<ToDB<T>> extends infer R
      ? R extends ["DIVERGE"]
        ? "DIVERGE"
        : Render<R>
      : never
    : never
  : never;
