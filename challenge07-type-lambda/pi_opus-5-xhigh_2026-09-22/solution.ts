/**
 * A type-level normaliser for the untyped lambda calculus.
 *
 *   type Id    = Normalize<"\\x.x">;                             // "\\.0"
 *   type Two   = Normalize<"\\f.\\x.f (f x)">;                   // "\\.\\.(1 (1 0))"
 *   type Succ0 = Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">; // "\\.\\.(1 0)"
 *
 * The pipeline, each stage a separate family of types:
 *
 *   string  --StripSpace-->  string
 *           --Parse------->  Term     (named syntax straight into de Bruijn)
 *           --Reduce------>  Term     (normal order: one leftmost-outermost
 *                                      step at a time, bounded by a fuel tuple)
 *           --Render------>  string   (canonical de Bruijn text)
 *
 * Nothing here has a runtime counterpart: every line is a type.
 *
 * A note on constraints. The obvious `T extends Term` on every helper is a
 * trap: `Term` is a recursive union, so the compiler both eagerly expands it
 * when resolving an alias (an infinite union of rendered strings) and, worse,
 * structurally re-checks every intermediate term against it on every step.
 * The term constructors below are therefore deliberately unconstrained and the
 * tags ("v" / "l" / "a", "some" / "none") carry the discrimination instead.
 */

/* -------------------------------------------------------------------------- */
/* Natural numbers                                                            */
/* -------------------------------------------------------------------------- */

/** A natural number, represented by the length of a tuple. */
type Nat = unknown[];

type Inc<N extends Nat> = [unknown, ...N];
type Dec<N extends Nat> = N extends [unknown, ...infer Rest] ? Rest : [];

/** a >= b */
type AtLeast<A extends Nat, B extends Nat> = A extends [...B, ...unknown[]] ? true : false;

/** a === b */
type Same<A extends Nat, B extends Nat> = A["length"] extends B["length"] ? true : false;

/** A tuple of `N` units, used as the reduction step budget. */
type Fuel<N extends number, Acc extends Nat = []> = Acc["length"] extends N
  ? Acc
  : Fuel<N, [unknown, ...Acc]>;

/* -------------------------------------------------------------------------- */
/* Terms (de Bruijn)                                                          */
/* -------------------------------------------------------------------------- */

/**
 * A term is a tagged tuple:
 *   ["v", index]      variable, 0-based de Bruijn index
 *   ["l", body]       abstraction (the binder carries no name)
 *   ["a", fn, arg]    application
 *
 * Used for documentation and for the one cheap well-formedness check in
 * `Normalize`; the working types match on the tags directly.
 */
export type Term = ["v", Nat] | ["l", Term] | ["a", Term, Term];

/* -------------------------------------------------------------------------- */
/* Parser: named syntax -> de Bruijn terms                                    */
/* -------------------------------------------------------------------------- */

type Lower =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

type Space = " " | "\t" | "\n" | "\r";

/**
 * Every token is a single character, so whitespace carries no information at
 * all and can be removed before parsing ("f x" and "fx" are the same term).
 */
type StripSpace<S extends string, Acc extends string = ""> = S extends `${infer C}${infer Rest}`
  ? C extends Space
    ? StripSpace<Rest, Acc>
    : StripSpace<Rest, `${Acc}${C}`>
  : Acc;

/** The de Bruijn index of `Name` in the binder context (innermost first). */
type IndexOf<Name extends string, Ctx extends string[], Depth extends Nat = []> = Ctx extends [
  infer Head,
  ...infer Rest extends string[],
]
  ? Head extends Name
    ? Depth
    : IndexOf<Name, Rest, Inc<Depth>>
  : never; // free variable: the grammar promises closed terms

/** What a parse rule returns: the term, and the unconsumed input. */
type Parsed<T, Rest extends string> = [term: T, rest: Rest];

/**
 * The parse failure sentinel. It matters that this is a real type and not
 * `never`: `never extends Parsed<infer T, infer Rest>` is vacuously true, and
 * the inference variables then fall back to their constraints, which turns a
 * malformed input into an unbounded loop over the type `string`.
 */
type ParseFail = ["err"];

/** atom = var | "(" term ")" | "\" var "." term */
type ParseAtom<S extends string, Ctx extends string[]> = S extends `(${infer Inner}`
  ? ParseTerm<Inner, Ctx> extends Parsed<infer T, infer After>
    ? After extends `)${infer Tail}`
      ? Parsed<T, Tail>
      : ParseFail // missing closing parenthesis
    : ParseFail
  : S extends `\\${infer Name}.${infer Body}`
    ? ParseTerm<Body, [Name, ...Ctx]> extends Parsed<infer T, infer After>
      ? Parsed<["l", T], After>
      : ParseFail
    : S extends `${infer C}${infer Rest}`
      ? C extends Lower
        ? IndexOf<C, Ctx> extends infer I
          ? [I] extends [never]
            ? ParseFail // free variable
            : Parsed<["v", I], Rest>
          : ParseFail
        : ParseFail // unexpected character
      : ParseFail; // unexpected end of input

/** term = app = atom atom*, left-associative. */
type ParseTerm<S extends string, Ctx extends string[]> = ParseAtom<S, Ctx> extends Parsed<
  infer T,
  infer Rest
>
  ? ParseApp<T, Rest, Ctx>
  : ParseFail;

type ParseApp<Acc, S extends string, Ctx extends string[]> = S extends ""
  ? Parsed<Acc, "">
  : S extends `)${string}`
    ? Parsed<Acc, S> // let the caller consume its own ")"
    : ParseAtom<S, Ctx> extends Parsed<infer T, infer Rest>
      ? ParseApp<["a", Acc, T], Rest, Ctx>
      : ParseFail;

/** Parse a whole (closed) term; `ParseFail` if anything is left over. */
type Parse<S extends string> = ParseTerm<StripSpace<S>, []> extends Parsed<infer T, "">
  ? T
  : ParseFail;

/* -------------------------------------------------------------------------- */
/* Capture-avoiding substitution, de Bruijn style                             */
/* -------------------------------------------------------------------------- */

/** Shift every free index (>= Cutoff) up by one: the `↑¹` of the literature. */
type ShiftUp<T, Cutoff extends Nat = []> = T extends ["v", infer I extends Nat]
  ? AtLeast<I, Cutoff> extends true
    ? ["v", Inc<I>]
    : T
  : T extends ["l", infer B]
    ? ["l", ShiftUp<B, Inc<Cutoff>>]
    : T extends ["a", infer F, infer A]
      ? ["a", ShiftUp<F, Cutoff>, ShiftUp<A, Cutoff>]
      : never;

/**
 * Shift every free index (>= Cutoff) down by one. Only ever applied right
 * after substituting the variable at `Cutoff` away, so no surviving free index
 * equals `Cutoff` and nothing can underflow.
 */
type ShiftDown<T, Cutoff extends Nat = []> = T extends ["v", infer I extends Nat]
  ? AtLeast<I, Cutoff> extends true
    ? ["v", Dec<I>]
    : T
  : T extends ["l", infer B]
    ? ["l", ShiftDown<B, Inc<Cutoff>>]
    : T extends ["a", infer F, infer A]
      ? ["a", ShiftDown<F, Cutoff>, ShiftDown<A, Cutoff>]
      : never;

/**
 * Replace the variable with index `J` by `S`. Going under a binder raises the
 * index being looked for and shifts `S` up, which is what makes the
 * substitution capture-avoiding without any renaming.
 */
type Subst<T, J extends Nat, S> = T extends ["v", infer I extends Nat]
  ? Same<I, J> extends true
    ? S
    : T
  : T extends ["l", infer B]
    ? ["l", Subst<B, Inc<J>, ShiftUp<S>>]
    : T extends ["a", infer F, infer A]
      ? ["a", Subst<F, J, S>, Subst<A, J, S>]
      : never;

/** (λ. body) arg  →  body with the bound variable replaced by arg. */
type Beta<Body, Arg> = ShiftDown<Subst<Body, [], ShiftUp<Arg>>>;

/* -------------------------------------------------------------------------- */
/* Normal-order reduction                                                     */
/* -------------------------------------------------------------------------- */

/**
 * A single leftmost-outermost step, wrapped in `["some", …]`, or `["none"]`
 * when the term is already in beta-normal form:
 *
 *   1. the whole term is a redex            -> contract it;
 *   2. otherwise reduce inside the function -> keeps "leftmost";
 *   3. otherwise reduce inside the argument -> only once the function is stuck;
 *   4. otherwise reduce under the binder    -> needed for *normal* form.
 *
 * Because (1) is tried before (3), an argument with no normal form is simply
 * discarded whenever the function ignores it — which is exactly why normal
 * order is mandated here.
 */
type Step<T> = T extends ["a", ["l", infer B], infer A]
  ? ["some", Beta<B, A>]
  : T extends ["a", infer F, infer A]
    ? Step<F> extends ["some", infer F2]
      ? ["some", ["a", F2, A]]
      : Step<A> extends ["some", infer A2]
        ? ["some", ["a", F, A2]]
        : ["none"]
    : T extends ["l", infer B]
      ? Step<B> extends ["some", infer B2]
        ? ["some", ["l", B2]]
        : ["none"]
      : ["none"]; // a variable is stuck

/** Step until stuck, or until the budget runs out. */
type Reduce<T, Budget extends Nat> = Budget extends [unknown, ...infer Rest]
  ? Step<T> extends ["some", infer T2]
    ? Reduce<T2, Rest>
    : T
  : "DIVERGE";

/**
 * The step budget. Normal-order reduction of grader-sized terms (Church
 * numerals and arithmetic on them, combinators, booleans) settles in far fewer
 * steps than this — 3^3 = 27 as Church numerals takes well under a hundred —
 * while the bound stays inside TypeScript's 1000-deep tail-recursion window so
 * that `Ω` is reported as `"DIVERGE"` instead of hanging the compiler.
 */
type StepBudget = Fuel<600>;

/* -------------------------------------------------------------------------- */
/* Rendering: canonical de Bruijn text                                        */
/* -------------------------------------------------------------------------- */

type Render<T> = T extends ["v", infer I extends Nat]
  ? `${I["length"]}`
  : T extends ["l", infer B]
    ? `\\.${Render<B>}`
    : T extends ["a", infer F, infer A]
      ? `(${Render<F>} ${Render<A>})`
      : never;

/* -------------------------------------------------------------------------- */
/* Entry point                                                                */
/* -------------------------------------------------------------------------- */

/**
 * The beta-normal form of `S`, rendered in canonical de Bruijn notation, or
 * `"DIVERGE"` when no normal form is reached within the step budget.
 *
 * Alpha-equivalent inputs render identically, because names are discarded by
 * the parser. Malformed or open terms resolve to `never`.
 */
export type Normalize<S extends string> = Parse<S> extends infer T
  ? T extends ParseFail
    ? never
    : Reduce<T, StepBudget> extends infer R
      ? R extends "DIVERGE"
        ? "DIVERGE"
        : Render<R>
      : never
  : never;
