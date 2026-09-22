/**
 * Type-level normaliser for the untyped lambda calculus.
 *
 *   Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">  // "\\.\\.(1 0)"
 *
 * Pipeline:
 *   1. Parse      - stack machine over the characters, building de Bruijn terms directly by
 *                   resolving each variable against the environment of enclosing binders.
 *   2. Contract   - capture-avoiding substitution with de Bruijn index shifting.
 *   3. Normalize  - normal-order (leftmost-outermost) reduction by a zipper machine, bounded by
 *                   MaxSteps beta-reductions; running out yields "DIVERGE".
 *   4. Render     - canonical de Bruijn output: "\\." body, "(f a)", decimal indices.
 *
 * Working inside TypeScript's limits:
 *   - A tail-recursive conditional type may iterate at most 1000 times and non-tail
 *     instantiation nests at most ~100 deep, while terms met during reduction get far deeper
 *     than 100/k. So every traversal is a flat state machine with an explicit stack that runs in
 *     bounded slices and is resumed by a tail-recursive driver.
 *   - There is a budget of 5M instantiations per checked type. Every node therefore caches its
 *     "free level" (1 + its largest free de Bruijn index, 0 if closed); substitution and shifting
 *     skip any subterm whose free level shows it cannot change, so closed subterms (combinators,
 *     Church numerals, ...) are shared instead of copied. Nodes also cache whether they are
 *     already in normal form, so the reducer never walks into a subterm without redexes.
 *   - Terms are never compared structurally against the recursive Term type: TypeScript gives up
 *     on deeply nested comparisons, so decisions only match node tags or string sentinels.
 */

// ===========================================================================
// Terms (de Bruijn). Numbers are unary tuples: [] = 0, [1] = 1, [1, 1] = 2, ...
// ===========================================================================

type Nat = 1[];

/**
 * The shape of terms (documentation only; see the note above). Every node caches its free
 * `level` and whether it is already in `normal` form (contains no redex).
 */
export type Term =
  | [tag: "var", level: Nat, normal: true, index: Nat]
  | [tag: "lam", level: Nat, normal: boolean, body: Term]
  | [tag: "app", level: Nat, normal: boolean, fn: Term, arg: Term];

type Max<A extends Nat, B extends Nat> = A extends [...B, ...Nat] ? A : B;
type Pred<N extends Nat> = N extends [1, ...infer Rest extends Nat] ? Rest : [];

type LevelOf<T> = T extends [string, infer L extends Nat, boolean, ...unknown[]] ? L : never;
type IsNormal<T> = T extends [string, Nat, infer N extends boolean, ...unknown[]] ? N : never;

/** An application is normal iff it is not a redex and both sides are normal. */
type AppIsNormal<F, A> = F extends ["lam", ...unknown[]]
  ? false
  : IsNormal<F> extends true
    ? IsNormal<A>
    : false;

// Constructors compute the cached fields eagerly (via `infer`) before building the tuple: tuple
// elements are resolved lazily, so an unevaluated field would chain through the whole term and
// blow the ~100-level nesting limit when finally forced.
type Var<I extends Nat> = ["var", [...I, 1], true, I];
type Lam<Body> = [Pred<LevelOf<Body>>, IsNormal<Body>] extends [infer L extends Nat, infer N extends boolean]
  ? ["lam", L, N, Body]
  : never;
type App<F, A> = [Max<LevelOf<F>, LevelOf<A>>, AppIsNormal<F, A>] extends [infer L extends Nat, infer N extends boolean]
  ? ["app", L, N, F, A]
  : never;

// ===========================================================================
// Resumable machines
//
// A machine returns ["more", ...state] after one slice of iterations; its driver resumes it
// (the driver is itself tail-recursive, so the total is up to ~1000 slices).
// ===========================================================================

/** Two-digit unary counter [low, high]: cheap to increment because both tuples stay short. */
type Counter = [low: Nat, high: Nat];
type Zero = [[], []];
type Tick<C extends Counter, Base extends number> = [...C[0], 1]["length"] extends Base
  ? [[], [...C[1], 1]]
  : [[...C[0], 1], C[1]];

/** One slice = 25 * 30 = 750 iterations, safely below the 1000-iteration limit. */
type TickSlice<C extends Counter> = Tick<C, 25>;
type SliceOver<C extends Counter> = C[1]["length"] extends 30 ? true : false;

// ===========================================================================
// 1. Parser
//
// Every open construct is a frame [kind, acc], acc being the application built so far at that
// level (Empty until its first atom). Kinds: "top" (whole input), "paren" ("(" ... ")") and
// "lam" ("\x." body). A lambda body extends as far right as possible, so "lam" frames are closed
// only by the ")" of an enclosing paren or by the end of input.
// ===========================================================================

type Whitespace = " " | "\t" | "\n" | "\r";
type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

type Empty = "EMPTY";
type ParseError = "PARSE_ERROR";

type TrimStart<S extends string> = S extends `${Whitespace}${infer Rest}` ? TrimStart<Rest> : S;

/** De Bruijn index of `Name`: the number of binders between the use and its nearest binder. */
type Lookup<Env extends string[], Name extends string, Depth extends Nat = []> = Env extends [
  infer Head extends string,
  ...infer Tail extends string[],
]
  ? Head extends Name
    ? Depth
    : Lookup<Tail, Name, [...Depth, 1]>
  : ParseError; // free variable

/** Appends an atom to the innermost frame: the first atom as-is, later ones by application. */
type PushAtom<Stack, Atom> = Stack extends [...infer Below, [infer Kind, infer Acc]]
  ? (Acc extends Empty ? Atom : App<Acc, Atom>) extends infer Next
    ? [...Below, [Kind, Next]]
    : never
  : ParseError;

/** Closes every "lam" frame on top of the stack, turning each body into an atom below it. */
type CloseLambdas<Stack, Env> = Stack extends [...infer Below, ["lam", infer Body]]
  ? Body extends Empty
    ? ParseError // "\x." with an empty body
    : Env extends [string, ...infer Outer]
      ? CloseLambdas<PushAtom<Below, Lam<Body>>, Outer>
      : ParseError
  : [Stack, Env];

type CloseParen<Stack, Env> =
  CloseLambdas<Stack, Env> extends [[...infer Below, ["paren", infer Inner]], infer Outer]
    ? Inner extends Empty
      ? ParseError // "()"
      : [PushAtom<Below, Inner>, Outer]
    : ParseError; // ")" without a matching "("

type Finish<Stack, Env> =
  CloseLambdas<Stack, Env> extends [[["top", infer Result]], []]
    ? Result extends Empty
      ? ParseError // empty input
      : Result
    : ParseError; // unclosed "("

type ParseChars<S extends string, Stack extends unknown[], Env extends string[]> =
  S extends `${infer C}${infer Rest}`
    ? C extends Whitespace
      ? ParseChars<Rest, Stack, Env>
      : C extends Letter
        ? Lookup<Env, C> extends infer I extends Nat
          ? PushAtom<Stack, Var<I>> extends infer Next extends unknown[]
            ? ParseChars<Rest, Next, Env>
            : ParseError
          : ParseError
        : C extends "\\"
          ? TrimStart<Rest> extends `${infer Name extends Letter}${infer AfterName}`
            ? TrimStart<AfterName> extends `.${infer Body}`
              ? ParseChars<Body, [...Stack, ["lam", Empty]], [Name, ...Env]>
              : ParseError
            : ParseError
          : C extends "("
            ? ParseChars<Rest, [...Stack, ["paren", Empty]], Env>
            : C extends ")"
              ? CloseParen<Stack, Env> extends [infer Next extends unknown[], infer Outer extends string[]]
                ? ParseChars<Rest, Next, Outer>
                : ParseError
              : ParseError // unexpected character
    : Finish<Stack, Env>;

/** Named source term -> de Bruijn term, or "PARSE_ERROR" (syntax error or free variable). */
export type Parse<S extends string> = ParseChars<S, [["top", Empty]], []>;

// ===========================================================================
// 2. Contraction: capture-avoiding substitution with index shifting
//
// Contracting (\. Body) Arg replaces the eliminated binder inside Body by Arg. With Depth the
// number of lambdas entered inside Body:
//   - a variable equal to Depth is that binder: it becomes Arg shifted up by Depth, so Arg's own
//     free variables skip the lambdas it now sits under (this makes substitution capture-avoiding);
//   - variables above Depth were bound outside the redex and drop by one (a binder disappeared);
//   - variables below Depth are bound inside Body and are untouched.
// A subterm whose free level is <= Depth only has variables of the last kind, so it is reused
// as-is; likewise shifting skips subterms with free level <= cutoff.
//
// Work items (top of stack = last element):
//   ["sub", term, depth]          substitute into term
//   ["shift", term, by, cutoff]   add `by` to every free variable (index >= cutoff) of term
//   ["lam"] / ["app"]             rebuild a node from the top one / two finished values
//   ["appFn", f] / ["appArg", a]  rebuild an application from one finished value and the
//                                 child that needed no change
// ===========================================================================

type AtLeast<A extends Nat, B extends Nat> = A extends [...B, ...Nat] ? true : false;

/**
 * Work for rebuilding an application whose children are visited by VisitF / VisitA. A child
 * that cannot change (Keep*) is carried in the rebuild item instead of being visited.
 */
type AppWork<F, A, KeepF, KeepA, VisitF, VisitA> = KeepF extends true
  ? [["appFn", F], VisitA]
  : KeepA extends true
    ? [["appArg", A], VisitF]
    : [["app"], VisitA, VisitF];

type SubstituteMachine<Work, Values extends unknown[], Arg, Clock extends Counter = Zero> =
  SliceOver<Clock> extends true
    ? ["more", Work, Values, Arg]
    : Work extends [...infer Rest, infer Item]
      ? Item extends ["sub", infer T, infer Depth extends Nat]
        ? AtLeast<Depth, LevelOf<T>> extends true
          ? SubstituteMachine<Rest, [...Values, T], Arg, TickSlice<Clock>>
          : T extends ["var", Nat, true, infer I extends Nat]
            ? I extends Depth
              ? SubstituteMachine<[...Rest, ["shift", Arg, Depth, []]], Values, Arg, TickSlice<Clock>>
              : SubstituteMachine<Rest, [...Values, Var<Pred<I>>], Arg, TickSlice<Clock>> // I > Depth, I >= 1
            : T extends ["lam", Nat, boolean, infer Body]
              ? SubstituteMachine<[...Rest, ["lam"], ["sub", Body, [...Depth, 1]]], Values, Arg, TickSlice<Clock>>
              : T extends ["app", Nat, boolean, infer F, infer A]
                ? SubstituteMachine<
                    [
                      ...Rest,
                      ...AppWork<F, A, AtLeast<Depth, LevelOf<F>>, AtLeast<Depth, LevelOf<A>>, ["sub", F, Depth], ["sub", A, Depth]>,
                    ],
                    Values,
                    Arg,
                    TickSlice<Clock>
                  >
                : never
        : Item extends ["shift", infer T, infer By extends Nat, infer Cutoff extends Nat]
          ? AtLeast<Cutoff, LevelOf<T>> extends true
            ? SubstituteMachine<Rest, [...Values, T], Arg, TickSlice<Clock>>
            : T extends ["var", Nat, true, infer I extends Nat]
              ? SubstituteMachine<Rest, [...Values, Var<[...I, ...By]>], Arg, TickSlice<Clock>> // I >= Cutoff
              : T extends ["lam", Nat, boolean, infer Body]
                ? SubstituteMachine<[...Rest, ["lam"], ["shift", Body, By, [...Cutoff, 1]]], Values, Arg, TickSlice<Clock>>
                : T extends ["app", Nat, boolean, infer F, infer A]
                  ? SubstituteMachine<
                      [
                        ...Rest,
                        ...AppWork<
                          F,
                          A,
                          AtLeast<Cutoff, LevelOf<F>>,
                          AtLeast<Cutoff, LevelOf<A>>,
                          ["shift", F, By, Cutoff],
                          ["shift", A, By, Cutoff]
                        >,
                      ],
                      Values,
                      Arg,
                      TickSlice<Clock>
                    >
                  : never
          : Item extends ["lam"]
            ? Values extends [...infer Below, infer Body]
              ? SubstituteMachine<Rest, [...Below, Lam<Body>], Arg, TickSlice<Clock>>
              : never
            : Item extends ["app"]
              ? Values extends [...infer Below, infer F, infer A]
                ? SubstituteMachine<Rest, [...Below, App<F, A>], Arg, TickSlice<Clock>>
                : never
              : Item extends ["appFn", infer F]
                ? Values extends [...infer Below, infer A]
                  ? SubstituteMachine<Rest, [...Below, App<F, A>], Arg, TickSlice<Clock>>
                  : never
                : Item extends ["appArg", infer A]
                  ? Values extends [...infer Below, infer F]
                    ? SubstituteMachine<Rest, [...Below, App<F, A>], Arg, TickSlice<Clock>>
                    : never
                  : never
      : ["done", Values[0]];

type DriveSubstitute<R> = R extends ["more", infer Work, infer Values extends unknown[], infer Arg]
  ? DriveSubstitute<SubstituteMachine<Work, Values, Arg>>
  : R extends ["done", infer T]
    ? T
    : never;

/** The contractum of the redex (\. Body) Arg. */
type Contract<Body, Arg> = DriveSubstitute<SubstituteMachine<[["sub", Body, []]], [], Arg>>;

// ===========================================================================
// 3. Normal-order reduction (zipper machine)
//
// The machine walks the term in pre-order (node, then function, then argument), which meets
// redexes leftmost-outermost first. The focus is the current subterm; the context stack is the
// path back to the root:
//   ["lam"]          focus is the body of an abstraction
//   ["appL", arg]    focus is the function of an application whose argument is `arg`
//   ["appR", fn]     focus is the argument of an application; `fn` is already normal
// Mode "down" examines the focus; mode "up" zips a normal focus back into its context.
//
// After contracting the redex at the focus, everything earlier in pre-order is still redex-free,
// except that the parent becomes a redex when the focus is its function and the contractum is an
// abstraction. So the machine re-examines the parent in that case and the contractum otherwise:
// exactly repeated leftmost-outermost reduction, without rescanning from the root each step.
// ===========================================================================

/** The step bound: 100 * 50 = 5000 beta-reductions. */
type StepsLow = 100;
type StepsHigh = 50;
export type MaxSteps = 5000;

type Diverged = "DIVERGE";

type NormalizeMachine<
  Mode extends "down" | "up",
  Focus,
  Context extends unknown[],
  Steps extends Counter,
  Clock extends Counter = Zero,
> = SliceOver<Clock> extends true
  ? ["more", Mode, Focus, Context, Steps]
  : Mode extends "down"
    ? IsNormal<Focus> extends true
      ? NormalizeMachine<"up", Focus, Context, Steps, TickSlice<Clock>> // nothing to do below here
      : Focus extends ["app", Nat, boolean, ["lam", Nat, boolean, infer Body], infer Arg]
        ? Steps[1]["length"] extends StepsHigh
          ? Diverged
          : Context extends [...infer Outer, ["appL", infer ParentArg]]
            ? NormalizeMachine<"down", App<Contract<Body, Arg>, ParentArg>, Outer, Tick<Steps, StepsLow>, TickSlice<Clock>>
            : NormalizeMachine<"down", Contract<Body, Arg>, Context, Tick<Steps, StepsLow>, TickSlice<Clock>>
        : Focus extends ["app", Nat, boolean, infer F, infer A]
          ? NormalizeMachine<"down", F, [...Context, ["appL", A]], Steps, TickSlice<Clock>>
          : Focus extends ["lam", Nat, boolean, infer Body]
            ? NormalizeMachine<"down", Body, [...Context, ["lam"]], Steps, TickSlice<Clock>>
            : NormalizeMachine<"up", Focus, Context, Steps, TickSlice<Clock>> // variable
    : Context extends [...infer Outer, infer Frame]
      ? Frame extends ["lam"]
        ? NormalizeMachine<"up", Lam<Focus>, Outer, Steps, TickSlice<Clock>>
        : Frame extends ["appL", infer Arg]
          ? NormalizeMachine<"down", Arg, [...Outer, ["appR", Focus]], Steps, TickSlice<Clock>>
          : Frame extends ["appR", infer Fn]
            ? NormalizeMachine<"up", App<Fn, Focus>, Outer, Steps, TickSlice<Clock>>
            : never
      : ["done", Focus];

type DriveNormalize<R> = R extends [
  "more",
  infer Mode extends "down" | "up",
  infer Focus,
  infer Context extends unknown[],
  infer Steps extends Counter,
]
  ? DriveNormalize<NormalizeMachine<Mode, Focus, Context, Steps>>
  : R;

// ===========================================================================
// 4. Rendering (explicit-stack machine producing the canonical string)
// ===========================================================================

type RenderMachine<Work, Out extends string, Clock extends Counter = Zero> = SliceOver<Clock> extends true
  ? ["more", Work, Out]
  : Work extends [...infer Rest, infer Item]
    ? Item extends string
      ? RenderMachine<Rest, `${Out}${Item}`, TickSlice<Clock>>
      : Item extends ["var", Nat, true, infer I extends Nat]
        ? RenderMachine<Rest, `${Out}${I["length"]}`, TickSlice<Clock>>
        : Item extends ["lam", Nat, boolean, infer Body]
          ? RenderMachine<[...Rest, Body], `${Out}\\.`, TickSlice<Clock>>
          : Item extends ["app", Nat, boolean, infer F, infer A]
            ? RenderMachine<[...Rest, ")", A, " ", F], `${Out}(`, TickSlice<Clock>>
            : never
    : ["done", Out];

type DriveRender<R> = R extends ["more", infer Work, infer Out extends string]
  ? DriveRender<RenderMachine<Work, Out>>
  : R extends ["done", infer Out]
    ? Out
    : never;

export type Render<T> = DriveRender<RenderMachine<[T], "">>;

// ===========================================================================
// Entry point
// ===========================================================================

type Finalize<R> = R extends ["done", infer NormalForm] ? Render<NormalForm> : Diverged;

/** Beta-normal form of the closed term `S` in canonical de Bruijn syntax, or "DIVERGE". */
export type Normalize<S extends string> = Parse<S> extends infer T
  ? T extends ParseError
    ? never
    : Finalize<DriveNormalize<NormalizeMachine<"down", T, [], Zero>>>
  : never;
