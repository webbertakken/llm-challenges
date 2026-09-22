/**
 * Type-level normaliser for the untyped lambda calculus.
 *
 *   Normalize<S> = Render<Normal<Parse<Lex<S>>>>   (or "DIVERGE" when the step budget runs out)
 *
 * Stages
 * 1. Lex: source string -> tokens ("\\", ".", "(", ")", single-letter variables; whitespace dropped).
 * 2. Parse: recursive descent over the grammar, resolving each variable to its de Bruijn index
 *    against an environment of enclosing binders (innermost first) while parsing.
 * 3. Normalise: normal-order (leftmost-outermost) reduction, implemented as the classic
 *    "weak-head normalise, then normalise the pieces" algorithm. Weak-head reduction is a
 *    Krivine-style machine (focus term + argument stack) run in bursts to stay under the
 *    1000-iteration tail-recursion cap. A step budget (fuel) is threaded through every call;
 *    one unit is spent per beta reduction.
 * 4. Render: canonical de Bruijn syntax.
 *
 * Natural numbers (indices, binder depths) are unary tuples of `0`; fuel is a base-100 pair of them.
 */

// ---------------------------------------------------------------- Naturals

type Nat = 0[];

type Succ<N extends Nat> = [...N, 0];

/** Builds a unary natural from a small decimal literal. */
type NatOf<N extends number, Acc extends Nat = []> = Acc["length"] extends N ? Acc : NatOf<N, Succ<Acc>>;

// ---------------------------------------------------------------- Terms (de Bruijn)

type Var<N extends Nat = Nat> = ["v", N];
type Lam<Body extends Term = Term> = ["l", Body];
type App<F extends Term = Term, A extends Term = Term> = ["a", F, A];

// Children are `unknown` here because a type alias cannot reference itself directly; the
// constructors above constrain them to `Term`.
type Term = Var | ["l", unknown] | ["a", unknown, unknown];

// ---------------------------------------------------------------- Lexer

type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

type Whitespace = " " | "\t" | "\n" | "\r";
type Punctuator = "\\" | "." | "(" | ")";
type Token = Letter | Punctuator;

type Lex<S extends string, Tokens extends Token[] = []> = S extends `${infer C}${infer Rest}`
  ? C extends Whitespace
    ? Lex<Rest, Tokens>
    : C extends Token
      ? Lex<Rest, [...Tokens, C]>
      : never // unexpected character
  : Tokens;

// ---------------------------------------------------------------- Parser (named -> de Bruijn)
//
//   term = atom atom*                 (left-associative application)
//   atom = var | "(" term ")" | "\" var "." term
//
// Env lists the enclosing binder names, innermost first; a variable's index is its position.
// Every parse function returns [term, remainingTokens], or never on a syntax error / free variable.

type IndexOf<X extends Letter, Env extends Letter[], Acc extends Nat = []> = Env extends [
  infer Head,
  ...infer Rest extends Letter[],
]
  ? Head extends X
    ? Acc
    : IndexOf<X, Rest, Succ<Acc>>
  : never; // free variable

type ParseTerm<T extends Token[], Env extends Letter[]> = ParseAtom<T, Env> extends [
  infer First extends Term,
  infer Rest extends Token[],
]
  ? AppTail<First, Rest, Env>
  : never;

type AppTail<Acc extends Term, T extends Token[], Env extends Letter[]> = T extends [Letter | "(" | "\\", ...Token[]]
  ? ParseAtom<T, Env> extends [infer Arg extends Term, infer Rest extends Token[]]
    ? AppTail<App<Acc, Arg>, Rest, Env>
    : never
  : [Acc, T];

type ParseAtom<T extends Token[], Env extends Letter[]> = T extends [infer X extends Letter, ...infer Rest extends Token[]]
  ? [Var<IndexOf<X, Env>>, Rest]
  : T extends ["\\", infer X extends Letter, ".", ...infer Rest extends Token[]]
    ? ParseTerm<Rest, [X, ...Env]> extends [infer Body extends Term, infer After extends Token[]]
      ? [Lam<Body>, After]
      : never
    : T extends ["(", ...infer Rest extends Token[]]
      ? ParseTerm<Rest, Env> extends [infer Inner extends Term, [")", ...infer After extends Token[]]]
        ? [Inner, After]
        : never
      : never;

type Parse<T extends Token[]> = ParseTerm<T, []> extends [infer Result extends Term, []] ? Result : never;

// ---------------------------------------------------------------- Substitution
//
// Beta: (\. Body) Arg  ->  Body[0 := Arg], with Body's other free variables shifted down by one.
// Walking under D binders, variable k is:
//   k == D  -> the argument, its free variables lifted by D (Lift)
//   k >  D  -> k - 1 (a variable free in the redex loses the removed binder)
//   k <  D  -> unchanged (bound inside Body)

/** Adds `By` to every variable of `T` that is free relative to `Cutoff` binders. */
type Lift<T, By extends Nat, Cutoff extends Nat = []> = By extends []
  ? T
  : T extends Var<infer K>
    ? K extends [...Cutoff, ...Nat]
      ? Var<[...K, ...By]>
      : T
    : T extends Lam<infer Body>
      ? Lam<Lift<Body, By, Succ<Cutoff>>>
      : T extends App<infer F, infer A>
        ? App<Lift<F, By, Cutoff>, Lift<A, By, Cutoff>>
        : never;

type Instantiate<T, Arg extends Term, D extends Nat = []> = T extends Var<infer K>
  ? K extends D
    ? Lift<Arg, D>
    : K extends [...D, 0, ...infer Above extends Nat]
      ? Var<[...D, ...Above]>
      : T
  : T extends Lam<infer Body>
    ? Lam<Instantiate<Body, Arg, Succ<D>>>
    : T extends App<infer F, infer A>
      ? App<Instantiate<F, Arg, D>, Instantiate<A, Arg, D>>
      : never;

// ---------------------------------------------------------------- Fuel (step budget)
//
// A two-digit base-100 counter [hundreds, units] so that spending one step is O(1) rather than
// copying a long tuple, and so budgets above TypeScript's 10 000-element tuple cap are possible.

type Fuel = [Nat, Nat];

/** Spends one step; `never` when the budget is exhausted. */
type Burn<F extends Fuel> = F extends [infer Hi extends Nat, [0, ...infer Lo extends Nat]]
  ? [Hi, Lo]
  : F extends [[0, ...infer Hi extends Nat], []]
    ? [Hi, NatOf<99>]
    : never;

// ---------------------------------------------------------------- Normal-order reduction
//
// Weak-head reduction runs as a small abstract machine (in the style of the Krivine machine):
// the focus term plus a stack of pending arguments. Unwinding an application pushes its argument;
// meeting an abstraction with a pending argument performs a beta step (costing one unit of fuel).
// Arguments are never touched here, which is what makes the strategy normal order: an argument is
// only reduced once it is known to survive (it ends up as an argument of a variable head).
//
// The machine is tail-recursive but TypeScript caps a single tail-recursive loop at 1000
// iterations, so it runs in bursts of `Burst` transitions and a driver loop resumes it.
//
// Full normalisation: take the weak-head normal form (head + arguments); if the head is an
// abstraction (no arguments left) normalise its body, otherwise the head is a variable and each
// argument is normalised left to right. Every result is [term, remainingFuel] or Diverge.

type Diverge = "DIVERGE";
type Burst = 500;

type Machine<T, Stack extends Term[], F extends Fuel, Count extends Nat = []> = Count["length"] extends Burst
  ? ["more", T, Stack, F]
  : T extends App<infer Fn, infer Arg>
    ? Machine<Fn, [Arg, ...Stack], F, Succ<Count>>
    : T extends Lam<infer Body>
      ? Stack extends [infer Arg extends Term, ...infer Rest extends Term[]]
        ? [Burn<F>] extends [infer F2 extends Fuel]
          ? [F2] extends [never]
            ? Diverge
            : Machine<Instantiate<Body, Arg>, Rest, F2, Succ<Count>>
          : Diverge
        : ["done", T, [], F]
      : ["done", T, Stack, F];

/** Weak-head normal form as [head, arguments, remainingFuel], or Diverge. */
type Whnf<T, Stack extends Term[], F extends Fuel> = Machine<T, Stack, F> extends infer Result
  ? Result extends ["more", infer T2, infer S2 extends Term[], infer F2 extends Fuel]
    ? Whnf<T2, S2, F2>
    : Result extends ["done", infer Head extends Term, infer Args extends Term[], infer F2 extends Fuel]
      ? [Head, Args, F2]
      : Diverge
  : never;

type Normal<T extends Term, F extends Fuel> = Whnf<T, [], F> extends [
  infer Head extends Term,
  infer Args extends Term[],
  infer F2 extends Fuel,
]
  ? Head extends Lam<infer Body>
    ? Normal<Body, F2> extends [infer NBody extends Term, infer F3 extends Fuel]
      ? [Lam<NBody>, F3]
      : Diverge
    : NormalArgs<Head, Args, F2>
  : Diverge;

/** Normalises the arguments of a variable head left to right, rebuilding the application. */
type NormalArgs<Acc extends Term, Args extends Term[], F extends Fuel> = Args extends [
  infer Arg extends Term,
  ...infer Rest extends Term[],
]
  ? Normal<Arg, F> extends [infer NArg extends Term, infer F2 extends Fuel]
    ? NormalArgs<App<Acc, NArg>, Rest, F2>
    : Diverge
  : [Acc, F];

// ---------------------------------------------------------------- Rendering

type Render<T> = T extends Var<infer K>
  ? `${K["length"]}`
  : T extends Lam<infer Body>
    ? `\\.${Render<Body>}`
    : T extends App<infer F, infer A>
      ? `(${Render<F>} ${Render<A>})`
      : never;

// ---------------------------------------------------------------- Entry point

/** Step budget in hundreds of beta reductions: 100 means at most 10 000 steps before "DIVERGE". */
export type StepBoundHundreds = 100;

type NormalizeTerm<T extends Term> = Normal<T, [NatOf<StepBoundHundreds>, []]> extends [infer N extends Term, Fuel]
  ? Render<N>
  : Diverge;

/** Beta-normal form of a closed named lambda term, in canonical de Bruijn syntax. */
export type Normalize<S extends string> = [Parse<Lex<S>>] extends [infer T extends Term]
  ? [T] extends [never]
    ? never
    : NormalizeTerm<T>
  : never;
