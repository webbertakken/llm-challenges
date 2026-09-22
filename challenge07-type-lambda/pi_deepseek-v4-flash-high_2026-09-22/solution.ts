/**
 * A type-level normaliser for the untyped lambda calculus.
 *
 * The whole pipeline is expressed in types:
 *
 *   Normalize<S>
 *     Tokenize       string literal -> tuple of single-character tokens
 *     ParseTerm      recursive-descent parser -> *named* AST
 *     ToDeBruijn     resolve names against a binder stack -> de Bruijn AST
 *     NormalizeSteps normal-order (leftmost-outermost) reduction with fuel
 *     Render         canonical de Bruijn syntax
 *
 * Named AST:     ["var", name] | ["abs", name, body] | ["app", fn, arg]
 * De Bruijn AST: ["var", index] | ["abs", body] | ["app", fn, arg]
 *
 * Reduction implements the standard capture-avoiding de Bruijn beta rule
 *   (\.M) N  ->  shiftDown(subst(M, 0, shiftUp(N, 0)), 0)
 * so no alpha-renaming is ever needed.
 */

/* ------------------------------------------------------------------ *
 * Natural-number arithmetic via tuple lengths                         *
 * ------------------------------------------------------------------ */

/** A tuple of `N` `unknown` elements. Tail-recursive, so `N` may be large. */
type Repeat<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Repeat<N, [...Acc, unknown]>;

/** `N + 1`. */
type Inc<N extends number> = [...Repeat<N>, unknown]["length"] & number;

/** `A + B`. */
type Add<A extends number, B extends number> = [...Repeat<A>, ...Repeat<B>]["length"] & number;

/** `A - B`; `never` when `B > A`. */
type Sub<A extends number, B extends number> = Repeat<A> extends [...Repeat<B>, ...infer Rest]
  ? Rest["length"] & number
  : never;

/** `true` iff `A >= B`. */
type Gte<A extends number, B extends number> = Repeat<A> extends [...Repeat<B>, ...unknown[]]
  ? true
  : false;

/** `true` iff the two literal types are mutually assignable. */
type Same<A, B> = A extends B ? (B extends A ? true : false) : false;

/* ------------------------------------------------------------------ *
 * Lexing and parsing                                                  *
 * ------------------------------------------------------------------ */

/** Splits `S` into single-character tokens, dropping insignificant whitespace. */
type Tokenize<S extends string, Tokens extends string[] = []> = S extends `${infer Char}${infer Rest}`
  ? Char extends " " | "\t" | "\n" | "\r"
    ? Tokenize<Rest, Tokens>
    : Tokenize<Rest, [...Tokens, Char]>
  : Tokens;

/** `term = app` (the top-level entry point of the grammar). */
type ParseTerm<Tokens extends string[]> = ParseApp<Tokens>;

/** `app = atom atom*`, left-associative. */
type ParseApp<Tokens extends string[]> = ParseAtom<Tokens> extends [
  infer Fn,
  infer Rest extends string[],
]
  ? ParseAppRest<Fn, Rest>
  : never;

type ParseAppRest<Fn, Tokens extends string[]> = Tokens extends [
  infer Next extends string,
  ...infer Rest extends string[],
]
  ? Next extends "." | ")"
    ? [Fn, Tokens]
    : ParseAtom<Tokens> extends [infer Arg, infer After extends string[]]
      ? ParseAppRest<["app", Fn, Arg], After>
      : [Fn, Tokens]
  : [Fn, Tokens];

/** `atom = var | "(" term ")" | "\" var "." term`. */
type ParseAtom<Tokens extends string[]> = Tokens extends [
  "\\",
  infer Name extends string,
  ".",
  ...infer Rest extends string[],
]
  ? ParseTerm<Rest> extends [infer Body, infer After extends string[]]
    ? [["abs", Name, Body], After]
    : never
  : Tokens extends ["(", ...infer Rest extends string[]]
    ? ParseTerm<Rest> extends [infer Inner, [")", ...infer After extends string[]]]
      ? [Inner, After]
      : never
    : Tokens extends [infer Name extends string, ...infer Rest extends string[]]
      ? Name extends "(" | ")" | "\\" | "."
        ? never
        : [["var", Name], Rest]
      : never;

/** Parses a complete term, failing to `never` when any token is left over. */
type Parse<S extends string> = ParseTerm<Tokenize<S>> extends [infer Term, []] ? Term : never;

/* ------------------------------------------------------------------ *
 * Name resolution -> de Bruijn indices                                *
 * ------------------------------------------------------------------ */

/** Position of `Name` in `Env`, counting from the innermost binder. */
type IndexOf<Name extends string, Env extends string[], Seen extends unknown[] = []> = Env extends [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? Head extends Name
    ? Seen["length"] & number
    : IndexOf<Name, Tail, [...Seen, unknown]>
  : never;

type ToDeBruijn<Term, Env extends string[]> = Term extends ["var", infer Name extends string]
  ? ["var", IndexOf<Name, Env>]
  : Term extends ["abs", infer Name extends string, infer Body]
    ? ["abs", ToDeBruijn<Body, [Name, ...Env]>]
    : Term extends ["app", infer Fn, infer Arg]
      ? ["app", ToDeBruijn<Fn, Env>, ToDeBruijn<Arg, Env>]
      : never;

/* ------------------------------------------------------------------ *
 * Shifting and capture-avoiding substitution                          *
 * ------------------------------------------------------------------ */

/** Increments every variable whose index is `>= Cutoff`. */
type ShiftUp<Term, Cutoff extends number> = Term extends ["var", infer Index extends number]
  ? Gte<Index, Cutoff> extends true
    ? ["var", Inc<Index>]
    : Term
  : Term extends ["abs", infer Body]
    ? ["abs", ShiftUp<Body, Inc<Cutoff>>]
    : Term extends ["app", infer Fn, infer Arg]
      ? ["app", ShiftUp<Fn, Cutoff>, ShiftUp<Arg, Cutoff>]
      : never;

/** Decrements every variable whose index is `>= Cutoff`. */
type ShiftDown<Term, Cutoff extends number> = Term extends ["var", infer Index extends number]
  ? Gte<Index, Cutoff> extends true
    ? ["var", Sub<Index, 1>]
    : Term
  : Term extends ["abs", infer Body]
    ? ["abs", ShiftDown<Body, Inc<Cutoff>>]
    : Term extends ["app", infer Fn, infer Arg]
      ? ["app", ShiftDown<Fn, Cutoff>, ShiftDown<Arg, Cutoff>]
      : never;

/**
 * Replaces the variable with index `Target` in `Term` by `Replacement`,
 * shifting the replacement up as it travels under binders so that no free
 * variable is ever captured.
 */
type Substitute<Term, Target extends number, Replacement> = Term extends [
  "var",
  infer Index extends number,
]
  ? Same<Index, Target> extends true
    ? Replacement
    : Term
  : Term extends ["abs", infer Body]
    ? ["abs", Substitute<Body, Inc<Target>, ShiftUp<Replacement, 0>>]
    : Term extends ["app", infer Fn, infer Arg]
      ? ["app", Substitute<Fn, Target, Replacement>, Substitute<Arg, Target, Replacement>]
      : never;

/** One beta step on a redex body and argument. */
type BetaReduce<Body, Arg> = ShiftDown<Substitute<Body, 0, ShiftUp<Arg, 0>>, 0>;

/* ------------------------------------------------------------------ *
 * Normal-order reduction                                              *
 * ------------------------------------------------------------------ */

/** A successful step on the leftmost-outermost redex, or a normal form. */
type Step<Term> = Term extends ["app", ["abs", infer Body], infer Arg]
  ? ["reduced", BetaReduce<Body, Arg>]
  : Term extends ["app", infer Fn, infer Arg]
    ? Step<Fn> extends ["reduced", infer ReducedFn]
      ? ["reduced", ["app", ReducedFn, Arg]]
      : Step<Arg> extends ["reduced", infer ReducedArg]
        ? ["reduced", ["app", Fn, ReducedArg]]
        : ["normal"]
    : Term extends ["abs", infer Body]
      ? Step<Body> extends ["reduced", infer ReducedBody]
        ? ["reduced", ["abs", ReducedBody]]
        : ["normal"]
      : ["normal"];

/** Structural equality on de Bruijn terms, used to spot a one-step cycle. */
type StructEq<A, B> = A extends ["var", infer X extends number]
  ? B extends ["var", infer Y extends number]
    ? Same<X, Y>
    : false
  : A extends ["abs", infer X]
    ? B extends ["abs", infer Y]
      ? StructEq<X, Y>
      : false
    : A extends ["app", infer X1, infer X2]
      ? B extends ["app", infer Y1, infer Y2]
        ? StructEq<X1, Y1> extends true
          ? StructEq<X2, Y2>
          : false
        : false
      : false;

/**
 * Reduces until a normal form is reached, a one-step cycle is detected, or the
 * fuel runs out. Tail-recursive, so thousands of steps are cheap.
 */
type NormalizeSteps<Term, Fuel extends unknown[]> = Step<Term> extends ["reduced", infer Next]
  ? StructEq<Term, Next> extends true
    ? ["diverge"]
    : Fuel extends [unknown, ...infer Rest]
      ? NormalizeSteps<Next, Rest>
      : ["diverge"]
  : ["term", Term];

/* ------------------------------------------------------------------ *
 * Canonical rendering                                                 *
 * ------------------------------------------------------------------ */

type Render<Term> = Term extends ["var", infer Index extends number]
  ? `${Index}`
  : Term extends ["abs", infer Body]
    ? `\\.${Render<Body>}`
    : Term extends ["app", infer Fn, infer Arg]
      ? `(${Render<Fn>} ${Render<Arg>})`
      : never;

/* ------------------------------------------------------------------ *
 * Public entry point                                                  *
 * ------------------------------------------------------------------ */

/** The step budget for one normalisation. */
type Fuel = Repeat<400>;

/**
 * Beta-normal form of a closed lambda term written with named variables, in
 * canonical de Bruijn syntax; `"DIVERGE"` if the budget is exhausted first.
 */
export type Normalize<S extends string> = NormalizeSteps<
  ToDeBruijn<Parse<S>, []>,
  Fuel
> extends ["term", infer NormalForm]
  ? Render<NormalForm>
  : "DIVERGE";
