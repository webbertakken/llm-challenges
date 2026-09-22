/**
 * Type-level untyped-lambda normaliser.
 *
 * Parse named terms → de Bruijn AST → normal-order beta reduction
 * (leftmost-outermost) with a finite step bound → canonical print.
 */

type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j"
  | "k" | "l" | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t"
  | "u" | "v" | "w" | "x" | "y" | "z";

type SkipWs<S extends string> = S extends ` ${infer R}`
  ? SkipWs<R>
  : S extends `\t${infer R}`
    ? SkipWs<R>
    : S extends `\n${infer R}`
      ? SkipWs<R>
      : S extends `\r${infer R}`
        ? SkipWs<R>
        : S;

// ---------------------------------------------------------------------------
// Peano-on-tuples for de Bruijn index arithmetic
// ---------------------------------------------------------------------------

type Repeat<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Repeat<N, [...Acc, unknown]>;

// ---------------------------------------------------------------------------
// AST: { v, n } variable | { l, b } abs | { a, f, x } app
// ---------------------------------------------------------------------------

type Lookup<
  X extends string,
  Ctx extends string[],
  I extends unknown[] = [],
> = Ctx extends [infer H extends string, ...infer T extends string[]]
  ? H extends X
    ? I["length"]
    : Lookup<X, T, [...I, unknown]>
  : never;

type ParseTerm<S extends string, Ctx extends string[]> = ParseApp<SkipWs<S>, Ctx>;

type ParseApp<S extends string, Ctx extends string[]> = ParseAtom<S, Ctx> extends [
  infer T,
  infer Rest extends string,
]
  ? ParseAppRest<T, Rest, Ctx>
  : never;

type AtomStart<S extends string> = SkipWs<S> extends `${infer C}${string}`
  ? C extends Letter | "(" | "\\"
    ? true
    : false
  : false;

type ParseAppRest<Left, S extends string, Ctx extends string[]> = AtomStart<
  S
> extends true
  ? ParseAtom<SkipWs<S>, Ctx> extends [infer Right, infer Rest extends string]
    ? ParseAppRest<{ a: true; f: Left; x: Right }, Rest, Ctx>
    : never
  : [Left, S];

type ParseAtom<S extends string, Ctx extends string[]> = SkipWs<S> extends `(${infer Rest}`
  ? ParseTerm<Rest, Ctx> extends [infer T, infer After extends string]
    ? SkipWs<After> extends `)${infer Rest2}`
      ? [T, Rest2]
      : never
    : never
  : SkipWs<S> extends `\\${infer Rest}`
    ? ParseAbs<Rest, Ctx>
    : SkipWs<S> extends `${infer C}${infer Rest}`
      ? C extends Letter
        ? [{ v: true; n: Lookup<C, Ctx> }, Rest]
        : never
      : never;

type ParseAbs<S extends string, Ctx extends string[]> = SkipWs<S> extends `${infer X}${infer Rest}`
  ? X extends Letter
    ? SkipWs<Rest> extends `.${infer Body}`
      ? ParseTerm<Body, [X, ...Ctx]> extends [infer T, infer After extends string]
        ? [{ l: true; b: T }, After]
        : never
      : never
    : never
  : never;

type Parse<S extends string> = ParseTerm<S, []> extends [
  infer T,
  infer Rest extends string,
]
  ? SkipWs<Rest> extends ""
    ? T
    : never
  : never;

// ---------------------------------------------------------------------------
// Shift and capture-avoiding substitution (TAPL de Bruijn)
// ---------------------------------------------------------------------------

type ShiftUp<C extends unknown[], T> = T extends { v: true; n: infer K extends number }
  ? Repeat<K> extends [...C, ...unknown[]]
    ? { v: true; n: [...Repeat<K>, unknown]["length"] }
    : { v: true; n: K }
  : T extends { l: true; b: infer B }
    ? { l: true; b: ShiftUp<[...C, unknown], B> }
    : T extends { a: true; f: infer F; x: infer X }
      ? { a: true; f: ShiftUp<C, F>; x: ShiftUp<C, X> }
      : never;

type ShiftDown<C extends unknown[], T> = T extends { v: true; n: infer K extends number }
  ? Repeat<K> extends [...C, ...unknown[]]
    ? Repeat<K> extends [unknown, ...infer R]
      ? { v: true; n: R["length"] }
      : never
    : { v: true; n: K }
  : T extends { l: true; b: infer B }
    ? { l: true; b: ShiftDown<[...C, unknown], B> }
    : T extends { a: true; f: infer F; x: infer X }
      ? { a: true; f: ShiftDown<C, F>; x: ShiftDown<C, X> }
      : never;

type Subst<J extends unknown[], S, T> = T extends { v: true; n: infer K extends number }
  ? Repeat<K> extends J
    ? J extends Repeat<K>
      ? S
      : { v: true; n: K }
    : { v: true; n: K }
  : T extends { l: true; b: infer B }
    ? { l: true; b: Subst<[...J, unknown], ShiftUp<[], S>, B> }
    : T extends { a: true; f: infer F; x: infer X }
      ? { a: true; f: Subst<J, S, F>; x: Subst<J, S, X> }
      : never;

type Beta<Body, Arg> = ShiftDown<[], Subst<[], ShiftUp<[], Arg>, Body>>;

// ---------------------------------------------------------------------------
// Leftmost-outermost single step
// ---------------------------------------------------------------------------

type Step<T> = T extends { a: true; f: infer F; x: infer X }
  ? F extends { l: true; b: infer B }
    ? { d: true; t: Beta<B, X> }
    : Step<F> extends { d: true; t: infer F2 }
      ? { d: true; t: { a: true; f: F2; x: X } }
      : Step<X> extends { d: true; t: infer X2 }
        ? { d: true; t: { a: true; f: F; x: X2 } }
        : { d: false; t: T }
  : T extends { l: true; b: infer B }
    ? Step<B> extends { d: true; t: infer B2 }
      ? { d: true; t: { l: true; b: B2 } }
      : { d: false; t: T }
    : { d: false; t: T };

type Gas = [
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
  1, 1, 1, 1,
];

type Reduce<T, N extends unknown[] = Gas> = N extends [unknown, ...infer Rest]
  ? Step<T> extends { d: true; t: infer U }
    ? Reduce<U, Rest>
    : T
  : Step<T> extends { d: true }
    ? "DIVERGE"
    : T;

// ---------------------------------------------------------------------------
// Canonical de Bruijn rendering
// ---------------------------------------------------------------------------

type Render<T> = T extends { v: true; n: infer N extends number }
  ? `${N}`
  : T extends { l: true; b: infer B }
    ? `\\.${Render<B>}`
    : T extends { a: true; f: infer F; x: infer X }
      ? `(${Render<F>} ${Render<X>})`
      : never;

export type Normalize<S extends string> = Parse<S> extends infer T
  ? [T] extends [never]
    ? never
    : Reduce<T> extends infer R
      ? R extends "DIVERGE"
        ? "DIVERGE"
        : Render<R>
      : never
  : never;
