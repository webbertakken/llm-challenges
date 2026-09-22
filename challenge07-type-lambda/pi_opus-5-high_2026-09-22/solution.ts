/**
 * A normaliser for the untyped lambda calculus, entirely in the type system.
 *
 *   Normalize<"\\x.x">                              // "\\.0"
 *   Normalize<"\\f.\\x.f (f x)">                    // "\\.\\.(1 (1 0))"
 *   Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)"> // "\\.\\.(1 0)"
 *
 * Pipeline:
 *
 *   StripWhitespace  single-letter variables make whitespace pure separation,
 *                    so it can be removed before parsing.
 *   Parse            recursive descent over the character stream, carrying a
 *                    binder environment, emitting de Bruijn terms directly.
 *   Run              normal-order (leftmost-outermost) single-step reduction,
 *                    iterated against a fuel tuple; exhausting fuel is
 *                    reported as "DIVERGE".
 *   Render           canonical de Bruijn text, applications always bracketed.
 *
 * Terms are tuples: ["V", index] | ["L", body] | ["A", fn, arg].
 * Indices are numeric literals; arithmetic on them is tuple-length arithmetic.
 */

/* -------------------------------------------------------------------------- */
/* Natural-number arithmetic on de Bruijn indices                             */
/* -------------------------------------------------------------------------- */

type Tuple<N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Tuple<N, [...Acc, unknown]>;

type Length<T extends unknown[]> = T["length"] extends infer N extends number ? N : never;

type Inc<N extends number> = Length<[...Tuple<N>, unknown]>;

type Add<A extends number, B extends number> = Length<[...Tuple<A>, ...Tuple<B>]>;

type Dec<N extends number> = Tuple<N> extends [unknown, ...infer Rest] ? Length<Rest> : 0;

/** `A >= B` for non-negative integer literals. */
type Gte<A extends number, B extends number> = Tuple<A> extends [...Tuple<B>, ...unknown[]]
  ? true
  : false;

type Eq<A extends number, B extends number> = A extends B ? true : false;

/* -------------------------------------------------------------------------- */
/* Terms                                                                      */
/* -------------------------------------------------------------------------- */

type Term = Var | Lam | App;
type Var = ["V", number];
type Lam = ["L", Term];
type App = ["A", Term, Term];

/* -------------------------------------------------------------------------- */
/* Lexing                                                                     */
/* -------------------------------------------------------------------------- */

type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

type Whitespace = " " | "\t" | "\n" | "\r";

type StripWhitespace<S extends string, Acc extends string = ""> = S extends `${infer Head}${infer Rest}`
  ? Head extends Whitespace
    ? StripWhitespace<Rest, Acc>
    : StripWhitespace<Rest, `${Acc}${Head}`>
  : Acc;

/* -------------------------------------------------------------------------- */
/* Parsing: named syntax -> de Bruijn terms                                   */
/* -------------------------------------------------------------------------- */

/** Binder environment, innermost binder first. */
type Env = string[];

/** The de Bruijn index of `Name`: how many binders sit between use and binder. */
type IndexOf<E extends Env, Name extends string, Acc extends unknown[] = []> = E extends [
  infer Head extends string,
  ...infer Tail extends Env,
]
  ? Head extends Name
    ? Length<Acc>
    : IndexOf<Tail, Name, [...Acc, unknown]>
  : never;

/** Every parser yields `[term, unconsumed-input]`, or `never` on a syntax error. */
type Parsed = [term: Term, rest: string];

/** `atom = var | "(" term ")" | abs`, where `abs = "\" var "." term`. */
type ParseAtom<S extends string, E extends Env> = S extends `\\${infer Name extends Letter}.${infer Tail}`
  ? ParseTerm<Tail, [Name, ...E]> extends [infer Body, infer Rest extends string]
    ? [["L", Body], Rest]
    : never
  : S extends `(${infer Tail}`
    ? ParseTerm<Tail, E> extends [infer Inner, infer Rest extends string]
      ? Rest extends `)${infer After}`
        ? [Inner, After]
        : never
      : never
    : S extends `${infer Name extends Letter}${infer Rest}`
      ? IndexOf<E, Name> extends infer Index extends number
        ? [["V", Index], Rest]
        : never
      : never;

/** Characters that may begin an atom, i.e. continue an application. */
type StartsAtom = Letter | "(" | "\\";

/** `app = atom atom*`, folded left. */
type AppLoop<Left, S extends string, E extends Env> = S extends `${infer Head}${string}`
  ? Head extends StartsAtom
    ? ParseAtom<S, E> extends [infer Right, infer Rest extends string]
      ? AppLoop<["A", Left, Right], Rest, E>
      : never
    : [Left, S]
  : [Left, S];

/** `term = app`. */
type ParseTerm<S extends string, E extends Env> = ParseAtom<S, E> extends [
  infer First,
  infer Rest extends string,
]
  ? AppLoop<First, Rest, E>
  : never;

/** Parses a whole closed term; anything left over is a syntax error. */
type Parse<S extends string> = ParseTerm<StripWhitespace<S>, []> extends [infer Result, ""]
  ? Result
  : never;

/* -------------------------------------------------------------------------- */
/* Shifting and capture-avoiding substitution (fused)                                 */
/* -------------------------------------------------------------------------- */

/** Adds `Delta` to every free index of `T` (free = index >= `Cutoff`). */
type ShiftBy<T, Delta extends number, Cutoff extends number = 0> = T extends [
  "V",
  infer K extends number,
]
  ? Gte<K, Cutoff> extends true
    ? ["V", Add<K, Delta>]
    : ["V", K]
  : T extends ["L", infer Body]
    ? ["L", ShiftBy<Body, Delta, Inc<Cutoff>>]
    : T extends ["A", infer Fn, infer Arg]
      ? ["A", ShiftBy<Fn, Delta, Cutoff>, ShiftBy<Arg, Delta, Cutoff>]
      : never;

/**
 * Substitutes `Arg` for index `J` in `Body` and removes the binder in one pass:
 * an occurrence of `J` becomes `Arg` lifted over the `J` binders it now sits
 * under (this is what makes substitution capture-avoiding), any index above `J`
 * drops by one because its binder has just disappeared, and anything below `J`
 * is left alone.
 *
 * Fusing the three textbook traversals (shift the argument up, substitute,
 * shift the result down) into one keeps TypeScript's instantiation depth low
 * enough to normalise noticeably larger terms.
 */
type SubstTop<Body, J extends number, Arg> = Body extends ["V", infer K extends number]
  ? Eq<K, J> extends true
    ? ShiftBy<Arg, J>
    : Gte<K, Inc<J>> extends true
      ? ["V", Dec<K>]
      : ["V", K]
  : Body extends ["L", infer Inner]
    ? ["L", SubstTop<Inner, Inc<J>, Arg>]
    : Body extends ["A", infer Fn, infer Arg2]
      ? ["A", SubstTop<Fn, J, Arg>, SubstTop<Arg2, J, Arg>]
      : never;

/** Contracts `(\.Body) Arg`. */
type Beta<Body, Arg> = SubstTop<Body, 0, Arg>;

/* -------------------------------------------------------------------------- */
/* Normal-order reduction                                                     */
/* -------------------------------------------------------------------------- */

/** Sentinel meaning "this subterm contains no redex". */
type NoRedex = "NONE";

/**
 * One leftmost-outermost step. An application is contracted *before* its
 * argument is touched, so a function that ignores a diverging argument still
 * reaches its normal form.
 */
type Step<T> = T extends ["A", infer Fn, infer Arg]
  ? Fn extends ["L", infer Body]
    ? Beta<Body, Arg>
    : Step<Fn> extends infer ReducedFn
      ? ReducedFn extends NoRedex
        ? Step<Arg> extends infer ReducedArg
          ? ReducedArg extends NoRedex
            ? NoRedex
            : ["A", Fn, ReducedArg]
          : never
        : ["A", ReducedFn, Arg]
      : never
  : T extends ["L", infer Body]
    ? Step<Body> extends infer ReducedBody
      ? ReducedBody extends NoRedex
        ? NoRedex
        : ["L", ReducedBody]
      : never
    : NoRedex;

/**
 * Iterates `Step` until the term is normal or the fuel runs out. Written
 * tail-recursively so TypeScript's tail-call elimination carries the loop.
 */
type Run<T, Fuel extends unknown[]> = Fuel extends [unknown, ...infer Rest]
  ? Step<T> extends infer Next
    ? Next extends NoRedex
      ? T
      : Run<Next, Rest>
    : never
  : "DIVERGE";

/** Step bound. See notes.md for why this size. */
type FuelSize = 400;

/* -------------------------------------------------------------------------- */
/* Rendering                                                                  */
/* -------------------------------------------------------------------------- */

type Render<T> = T extends ["V", infer K extends number]
  ? `${K}`
  : T extends ["L", infer Body]
    ? `\\.${Render<Body>}`
    : T extends ["A", infer Fn, infer Arg]
      ? `(${Render<Fn>} ${Render<Arg>})`
      : never;

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The beta-normal form of `S` in canonical de Bruijn notation, or `"DIVERGE"`
 * if no normal form is reached within the step bound. Malformed or open terms
 * resolve to `never`.
 */
export type Normalize<S extends string> = Run<Parse<S>, Tuple<FuelSize>> extends infer Result
  ? Result extends "DIVERGE"
    ? "DIVERGE"
    : Render<Result>
  : never;

export type { Term as LambdaTerm, Parsed as ParserResult };
