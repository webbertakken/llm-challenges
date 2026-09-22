/**
 * Type-level normaliser for the untyped lambda calculus.
 *
 * Pipeline: characters -> named parse with a binder environment (yielding a
 * de Bruijn term directly) -> normal-order reduction with fuel -> canonical
 * rendering. Terms are tuples: `["v", Index]`, `["l", Body]`, `["a", Fn, Arg]`,
 * where `Index` is a natural number encoded as a tuple so that shifting and
 * comparing indices is tuple surgery rather than arithmetic.
 */

// ---------------------------------------------------------------------------
// Natural numbers as tuples
// ---------------------------------------------------------------------------

type Nat = unknown[];
type Inc<N extends Nat> = [...N, unknown];
type Dec<N extends Nat> = N extends [unknown, ...infer Rest] ? Rest : never;
type ToNat<N extends number, Acc extends Nat = []> = Acc["length"] extends N ? Acc : ToNat<N, Inc<Acc>>;

// ---------------------------------------------------------------------------
// Terms in de Bruijn form
// ---------------------------------------------------------------------------

type Var<I extends Nat> = ["v", I];
type Lam<B> = ["l", B];
type App<F, A> = ["a", F, A];

// ---------------------------------------------------------------------------
// Lexer: string -> tuple of significant characters
// ---------------------------------------------------------------------------

type Whitespace = " " | "\t" | "\n" | "\r";

type Chars<S extends string, Acc extends string[] = []> = S extends `${infer Head}${infer Rest}`
  ? Head extends Whitespace
    ? Chars<Rest, Acc>
    : Chars<Rest, [...Acc, Head]>
  : Acc;

// ---------------------------------------------------------------------------
// Parser: characters -> de Bruijn term
//
//   term = atom atom*            (application, left-associative)
//   atom = var | "(" term ")" | "\" var "." term
//
// `Env` lists the enclosing binders, innermost first, so a variable's de
// Bruijn index is its position in `Env`.
// ---------------------------------------------------------------------------

// prettier-ignore
type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

type AtomStart = Letter | "(" | "\\";

type IndexOf<Name extends string, Env extends string[], Acc extends Nat = []> = Env extends [
  infer Head,
  ...infer Rest extends string[],
]
  ? Head extends Name
    ? Acc
    : IndexOf<Name, Rest, Inc<Acc>>
  : never;

type ParseTerm<Toks extends string[], Env extends string[]> = ParseAtom<Toks, Env> extends [
  infer Head,
  infer Rest extends string[],
]
  ? ParseApplications<Head, Rest, Env>
  : never;

/** Keeps applying `Acc` to following atoms while one starts. */
type ParseApplications<Acc, Toks extends string[], Env extends string[]> = Toks extends [AtomStart, ...string[]]
  ? ParseAtom<Toks, Env> extends [infer Arg, infer Rest extends string[]]
    ? ParseApplications<App<Acc, Arg>, Rest, Env>
    : never
  : [Acc, Toks];

type ParseAtom<Toks extends string[], Env extends string[]> = Toks extends [
  infer Name extends Letter,
  ...infer Rest extends string[],
]
  ? [Var<IndexOf<Name, Env>>, Rest]
  : Toks extends ["(", ...infer Rest extends string[]]
    ? ParseTerm<Rest, Env> extends [infer Inner, [")", ...infer After extends string[]]]
      ? [Inner, After]
      : never
    : Toks extends ["\\", infer Name extends Letter, ".", ...infer Rest extends string[]]
      ? ParseTerm<Rest, [Name, ...Env]> extends [infer Body, infer After extends string[]]
        ? [Lam<Body>, After]
        : never
      : never;

type Parse<S extends string> = ParseTerm<Chars<S>, []> extends [infer Term, []] ? Term : never;

// ---------------------------------------------------------------------------
// Substitution
// ---------------------------------------------------------------------------

/** Adds `By` to every free variable of `T` whose index is at least `Cutoff`. */
type Shift<T, By extends Nat, Cutoff extends Nat = []> = T extends Var<infer I>
  ? I extends [...Cutoff, ...Nat]
    ? Var<[...I, ...By]>
    : T
  : T extends Lam<infer Body>
    ? Lam<Shift<Body, By, Inc<Cutoff>>>
    : T extends App<infer Fn, infer Arg>
      ? App<Shift<Fn, By, Cutoff>, Shift<Arg, By, Cutoff>>
      : never;

/**
 * Beta-reduces a body: replaces the variable bound `Depth` binders up with
 * `Arg` (shifted past those binders) and lowers every free variable above it,
 * since the binder that held it is gone.
 */
type Instantiate<T, Arg, Depth extends Nat = []> = T extends Var<infer I>
  ? I extends Depth
    ? Depth extends []
      ? Arg
      : Shift<Arg, Depth>
    : I extends [...Depth, unknown, ...Nat]
      ? Var<Dec<I>>
      : T
  : T extends Lam<infer Body>
    ? Lam<Instantiate<Body, Arg, Inc<Depth>>>
    : T extends App<infer Fn, infer A>
      ? App<Instantiate<Fn, Arg, Depth>, Instantiate<A, Arg, Depth>>
      : never;

// ---------------------------------------------------------------------------
// Normal-order (leftmost-outermost) reduction
// ---------------------------------------------------------------------------

/** One reduction step, or `null` when `T` is already in normal form. */
type Step<T> = T extends App<Lam<infer Body>, infer Arg>
  ? Instantiate<Body, Arg>
  : T extends App<infer Fn, infer Arg>
    ? Step<Fn> extends infer NextFn
      ? NextFn extends null
        ? Step<Arg> extends infer NextArg
          ? NextArg extends null
            ? null
            : App<Fn, NextArg>
          : never
        : App<NextFn, Arg>
      : never
    : T extends Lam<infer Body>
      ? Step<Body> extends infer NextBody
        ? NextBody extends null
          ? null
          : Lam<NextBody>
        : never
      : null;

/**
 * Step budget: `Bursts` rounds of `BurstSize` reductions each. The inner burst and
 * the outer loop are both tail-recursive, so each stays well inside
 * TypeScript's per-loop iteration limit while the total bound is their product.
 */
type BurstSize = ToNat<50>;
type Bursts = ToNat<100>;

/** Runs up to `Budget` steps; yields [term, true] once normal, [term, false] if the budget ran out first. */
type Burst<T, Budget extends Nat> = Step<T> extends infer Next
  ? Next extends null
    ? [T, true]
    : Budget extends [unknown, ...infer Less]
      ? Burst<Next, Less>
      : [Next, false]
  : never;

type Reduce<T, Remaining extends Nat> = Burst<T, BurstSize> extends [infer Result, infer Done]
  ? Done extends true
    ? Render<Result>
    : Remaining extends [unknown, ...infer Less]
      ? Reduce<Result, Less>
      : "DIVERGE"
  : never;

// ---------------------------------------------------------------------------
// Rendering: canonical de Bruijn syntax
// ---------------------------------------------------------------------------

type Render<T> = T extends Var<infer I>
  ? `${I["length"]}`
  : T extends Lam<infer Body>
    ? `\\.${Render<Body>}`
    : T extends App<infer Fn, infer Arg>
      ? `(${Render<Fn>} ${Render<Arg>})`
      : never;

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

/** The beta-normal form of the closed lambda term `S`, or "DIVERGE". */
export type Normalize<S extends string> = Reduce<Parse<S>, Bursts>;
