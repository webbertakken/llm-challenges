/**
 * Normal-order beta normaliser for the closed untyped lambda calculus.
 * Named terms are parsed, converted to de Bruijn indices, reduced leftmost-
 * outermost, and rendered in canonical de Bruijn form.
 */

type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

type White = " " | "\t" | "\n" | "\r" | "\f" | "\v";
type SkipWs<S extends string> = S extends `${White}${infer Rest}` ? SkipWs<Rest> : S;

type IncMap = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  21, 22, 23, 24, 25, 26, 27, 28, 29, 30,
  31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
];
type DecMap = [
  0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9,
  10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  20, 21, 22, 23, 24, 25, 26, 27, 28, 29,
  30, 31, 32, 33, 34, 35, 36, 37, 38, 39,
];
type Inc<N extends number> = IncMap[N];
type Dec<N extends number> = DecMap[N];

type Ge<A extends number, B extends number> = B extends 0
  ? true
  : A extends 0
    ? false
    : Ge<Dec<A>, Dec<B>>;

type EqN<A extends number, B extends number> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

type NVar<Name extends string> = { readonly tag: "nvar"; readonly name: Name };
type NAbs<Param extends string, Body> = { readonly tag: "nabs"; readonly param: Param; readonly body: Body };
type NApp<Fn, Arg> = { readonly tag: "napp"; readonly fn: Fn; readonly arg: Arg };

type Var<I extends number> = { readonly tag: "var"; readonly index: I };
type Abs<Body> = { readonly tag: "abs"; readonly body: Body };
type App<Fn, Arg> = { readonly tag: "app"; readonly fn: Fn; readonly arg: Arg };

type ParseVar<S extends string> = S extends `${infer L extends Letter}${infer Rest}` ? [NVar<L>, Rest] : never;

type ParseAtom<S extends string> = SkipWs<S> extends `(${infer Rest}`
  ? ParseTerm<Rest> extends [infer Term, infer After extends string]
    ? SkipWs<After> extends `)${infer Tail}`
      ? [Term, Tail]
      : never
    : never
  : SkipWs<S> extends `\\${infer Rest}`
    ? ParseAbs<Rest>
    : ParseVar<SkipWs<S>>;

type ParseAbs<S extends string> = ParseVar<SkipWs<S>> extends [NVar<infer Param extends string>, infer After extends string]
  ? SkipWs<After> extends `.${infer Body}`
    ? ParseTerm<Body> extends [infer Term, infer Rest extends string]
      ? [NAbs<Param, Term>, Rest]
      : never
    : never
  : never;

type StartsAtom<S extends string> = S extends `${Letter}${string}`
  ? true
  : S extends `(${string}`
    ? true
    : S extends `\\${string}`
      ? true
      : false;

type ParseAppRest<Acc, S extends string> = StartsAtom<SkipWs<S>> extends true
  ? ParseAtom<S> extends [infer Arg, infer Rest extends string]
    ? ParseAppRest<NApp<Acc, Arg>, Rest>
    : never
  : [Acc, S];

type ParseTerm<S extends string> = ParseAtom<S> extends [infer Head, infer Rest extends string]
  ? ParseAppRest<Head, Rest>
  : never;

type Lookup<Name extends string, Env extends readonly string[], I extends number = 0> = Env extends readonly [
  infer Head extends string,
  ...infer Tail extends readonly string[],
]
  ? Head extends Name
    ? I
    : Lookup<Name, Tail, Inc<I>>
  : never;

type ToDB<T, Env extends readonly string[] = []> = T extends NVar<infer Name extends string>
  ? Var<Lookup<Name, Env>>
  : T extends NAbs<infer Param extends string, infer Body>
    ? Abs<ToDB<Body, [Param, ...Env]>>
    : T extends NApp<infer Fn, infer Arg>
      ? App<ToDB<Fn, Env>, ToDB<Arg, Env>>
      : never;

type ShiftUp<T, Cutoff extends number = 0> = T extends Var<infer I extends number>
  ? Ge<I, Cutoff> extends true
    ? Var<Inc<I>>
    : Var<I>
  : T extends Abs<infer Body>
    ? Abs<ShiftUp<Body, Inc<Cutoff>>>
    : T extends App<infer Fn, infer Arg>
      ? App<ShiftUp<Fn, Cutoff>, ShiftUp<Arg, Cutoff>>
      : never;

type ShiftDown<T, Cutoff extends number = 0> = T extends Var<infer I extends number>
  ? Ge<I, Cutoff> extends true
    ? Var<Dec<I>>
    : Var<I>
  : T extends Abs<infer Body>
    ? Abs<ShiftDown<Body, Inc<Cutoff>>>
    : T extends App<infer Fn, infer Arg>
      ? App<ShiftDown<Fn, Cutoff>, ShiftDown<Arg, Cutoff>>
      : never;

type Subst<T, Index extends number, Replacement> = T extends Var<infer I extends number>
  ? EqN<I, Index> extends true
    ? Replacement
    : Var<I>
  : T extends Abs<infer Body>
    ? Abs<Subst<Body, Inc<Index>, ShiftUp<Replacement>>>
    : T extends App<infer Fn, infer Arg>
      ? App<Subst<Fn, Index, Replacement>, Subst<Arg, Index, Replacement>>
      : never;

type Beta<Body, Arg> = ShiftDown<Subst<Body, 0, ShiftUp<Arg>>>;

type Done<T, F extends readonly unknown[]> = { readonly term: T; readonly fuel: F };

type Fuel<N extends number, Acc extends readonly unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Fuel<N, [...Acc, unknown]>;

type Whnf<T, F extends readonly unknown[]> = F extends readonly [unknown, ...infer Next extends readonly unknown[]]
  ? T extends App<infer Fn, infer Arg>
    ? Whnf<Fn, F> extends infer Reduced
      ? Reduced extends "DIVERGE"
        ? "DIVERGE"
        : Reduced extends Done<infer FnTerm, infer F2 extends readonly unknown[]>
          ? FnTerm extends Abs<infer Body>
            ? F2 extends readonly [unknown, ...infer F3 extends readonly unknown[]]
              ? Whnf<Beta<Body, Arg>, F3>
              : "DIVERGE"
            : Done<App<FnTerm, Arg>, F2>
          : never
      : never
    : Done<T, F>
  : "DIVERGE";

type Nf<T, F extends readonly unknown[]> = Whnf<T, F> extends infer Weak
  ? Weak extends "DIVERGE"
    ? "DIVERGE"
    : Weak extends Done<infer Term, infer F2 extends readonly unknown[]>
      ? Term extends Abs<infer Body>
        ? Nf<Body, F2> extends infer BodyNf
          ? BodyNf extends "DIVERGE"
            ? "DIVERGE"
            : BodyNf extends Done<infer BodyTerm, infer F3 extends readonly unknown[]>
              ? Done<Abs<BodyTerm>, F3>
              : never
          : never
        : Term extends App<infer Fn, infer Arg>
          ? Nf<Fn, F2> extends infer FnNf
            ? FnNf extends "DIVERGE"
              ? "DIVERGE"
              : FnNf extends Done<infer FnTerm, infer F3 extends readonly unknown[]>
                ? Nf<Arg, F3> extends infer ArgNf
                  ? ArgNf extends "DIVERGE"
                    ? "DIVERGE"
                    : ArgNf extends Done<infer ArgTerm, infer F4 extends readonly unknown[]>
                      ? Done<App<FnTerm, ArgTerm>, F4>
                      : never
                  : never
                : never
            : never
          : Done<Term, F2>
      : never
  : never;

type Show<T> = T extends Var<infer I extends number>
  ? `${I}`
  : T extends Abs<infer Body>
    ? `\\.${Show<Body>}`
    : T extends App<infer Fn, infer Arg>
      ? `(${Show<Fn>} ${Show<Arg>})`
      : never;

/** Beta-reduction steps before an unfinished term is reported as `"DIVERGE"`. */
type StepBound = 48;

type NormalizeTerm<T> = Nf<T, Fuel<StepBound>> extends infer Result
  ? Result extends "DIVERGE"
    ? "DIVERGE"
    : Result extends Done<infer Term, readonly unknown[]>
      ? Show<Term>
      : never
  : never;

/** Beta-normal form of a closed lambda term, in canonical de Bruijn syntax. */
export type Normalize<S extends string> = ParseTerm<S> extends [infer Term, infer Rest extends string]
  ? SkipWs<Rest> extends ""
    ? NormalizeTerm<ToDB<Term>>
    : never
  : never;
