/**
 * Type-level normaliser for the untyped lambda calculus.
 *
 * `Normalize<S>` parses a closed term written in the named syntax, converts it
 * to de Bruijn form, reduces it to beta-normal form using normal-order
 * (leftmost-outermost) reduction, and renders the canonical de Bruijn output.
 *
 * Representation choices:
 *  - de Bruijn indices are Peano strings: "Z" = 0, "SZ" = 1, "SSZ" = 2, ...
 *  - terms are tuples: ["V", index], ["λ", body], ["@", f, a].
 *
 * Beta reduction follows the standard de Bruijn formulation:
 *   (λ.M) N  →  shift(-1, 0, subst(M, 0, shift(1, 0, N)))
 * with a cutoff so bound variables are protected during shifting.
 */

/* ------------------------------------------------------------------ *
 * Shared small helpers
 * ------------------------------------------------------------------ */

type Whitespace = " " | "\t" | "\n" | "\r";
type Lower =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l"
  | "m" | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x"
  | "y" | "z";

/** Remove every whitespace character from `S`. */
type Strip<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Whitespace
    ? Strip<Tail>
    : `${Head}${Strip<Tail>}`
  : S;

/** Peano equality (both strings in "S*Z" form). */
type Eq<A extends string, B extends string> = A extends B ? (B extends A ? true : false) : false;

/** Peano less-than. */
type Lt<A extends string, B extends string> = B extends `S${infer Bt}`
  ? A extends `S${infer At}`
    ? Lt<At, Bt>
    : true
  : false;

/** Decrement a positive Peano numeral. */
type Dec<M extends string> = M extends `S${infer Rest}` ? Rest : never;

/* ------------------------------------------------------------------ *
 * De Bruijn term operations
 * ------------------------------------------------------------------ */

/** Shift every index >= C up by one. */
type ShiftUp<C extends string, T> = T extends ["V", infer M extends string]
  ? ["V", Lt<M, C> extends true ? M : `S${M}`]
  : T extends ["λ", infer Body]
    ? ["λ", ShiftUp<`S${C}`, Body>]
    : T extends ["@", infer F, infer A]
      ? ["@", ShiftUp<C, F>, ShiftUp<C, A>]
      : never;

/** Shift every index >= C down by one. */
type ShiftDown<C extends string, T> = T extends ["V", infer M extends string]
  ? ["V", Lt<M, C> extends true ? M : Dec<M>]
  : T extends ["λ", infer Body]
    ? ["λ", ShiftDown<`S${C}`, Body>]
    : T extends ["@", infer F, infer A]
      ? ["@", ShiftDown<C, F>, ShiftDown<C, A>]
      : never;

/** Substitute `S` for de Bruijn index `J` in term `T`. */
type Subst<T, J extends string, S> = T extends ["V", infer M extends string]
  ? Eq<M, J> extends true
    ? S
    : ["V", M]
  : T extends ["λ", infer Body]
    ? ["λ", Subst<Body, `S${J}`, ShiftUp<"Z", S>>]
    : T extends ["@", infer F, infer A]
      ? ["@", Subst<F, J, S>, Subst<A, J, S>]
      : never;

/** One beta reduction of the redex `@(λ.Body, Arg)`. */
type Beta<Body, Arg> = ShiftDown<"Z", Subst<Body, "Z", ShiftUp<"Z", Arg>>>;

/** Does `T` contain a redex? */
type HasRedex<T> = T extends ["@", infer F, infer A]
  ? F extends ["λ", infer _Body]
    ? true
    : HasRedex<F> extends true
      ? true
      : HasRedex<A>
  : T extends ["λ", infer Body]
    ? HasRedex<Body>
    : false;

/** One normal-order (leftmost-outermost) reduction step. */
type Step<T> = T extends ["@", infer F, infer A]
  ? F extends ["λ", infer Body]
    ? Beta<Body, A>
    : HasRedex<F> extends true
      ? ["@", Step<F>, A]
      : ["@", F, Step<A>]
  : T extends ["λ", infer Body]
    ? ["λ", Step<Body>]
    : T;

/* ------------------------------------------------------------------ *
 * Parsing (named syntax -> de Bruijn term)
 * ------------------------------------------------------------------ */

/** Peano index of variable `V` inside environment `Env` (innermost first). */
type IndexOf<V extends string, Env extends string, Acc extends string = "Z"> = Env extends `${infer Head}${infer Rest}`
  ? Head extends V
    ? Acc
    : IndexOf<V, Rest, `S${Acc}`>
  : never;

/** Can `S` begin an atom (variable, parenthesised term, or abstraction)? */
type StartsAtom<S extends string> = S extends `\\${string}`
  ? true
  : S extends `(${string}`
    ? true
    : S extends `${infer Head}${string}`
      ? Head extends Lower
        ? true
        : false
      : false;

/** Parse a single atom, returning `[term, rest]`. */
type ParseAtom<S extends string, Env extends string> = S extends `\\${infer V}${infer Tail}`
  ? V extends Lower
    ? Tail extends `.${infer Body}`
      ? ParseTerm<Body, `${V}${Env}`> extends [infer T, infer Rest extends string]
        ? [["λ", T], Rest]
        : never
      : never
    : never
  : S extends `(${infer Inside}`
    ? ParseTerm<Inside, Env> extends [infer T, infer After extends string]
      ? After extends `)${infer Rest}`
        ? [T, Rest]
        : never
      : never
    : S extends `${infer V}${infer Rest}`
      ? V extends Lower
        ? [["V", IndexOf<V, Env>], Rest]
        : never
      : never;

/** Parse `atom atom*` (left-associative application), returning `[term, rest]`. */
type ParseApp<S extends string, Env extends string> = ParseAtom<S, Env> extends [infer First, infer Rest extends string]
  ? ParseAppRest<Rest, Env, First>
  : never;

type ParseAppRest<S extends string, Env extends string, Acc> = StartsAtom<S> extends true
  ? ParseAtom<S, Env> extends [infer Next, infer Rest2 extends string]
    ? ParseAppRest<Rest2, Env, ["@", Acc, Next]>
    : never
  : [Acc, S];

/** A full term is an application of atoms. */
type ParseTerm<S extends string, Env extends string> = ParseApp<S, Env>;

/* ------------------------------------------------------------------ *
 * Rendering (de Bruijn term -> canonical string)
 * ------------------------------------------------------------------ */

type PeanoCount<M extends string, Acc extends unknown[] = []> = M extends `S${infer Rest}`
  ? PeanoCount<Rest, [...Acc, unknown]>
  : Acc["length"];

type Render<T> = T extends ["V", infer M extends string]
  ? `${PeanoCount<M>}`
  : T extends ["λ", infer Body]
    ? `\\.${Render<Body>}`
    : T extends ["@", infer F, infer A]
      ? `(${Render<F>} ${Render<A>})`
      : never;

/* ------------------------------------------------------------------ *
 * Reduction loop with a step bound
 * ------------------------------------------------------------------ */

type Repeat<T, N extends number, Acc extends unknown[] = []> = Acc["length"] extends N
  ? Acc
  : Repeat<T, N, [...Acc, T]>;

type Pop<T extends unknown[]> = T extends [unknown, ...infer R] ? R : [];

/** Maximum beta-reduction steps before reporting divergence. */
type StepBudget = Repeat<unknown, 100>;

type NormalizeLoop<T, Steps extends unknown[]> = Steps extends []
  ? "DIVERGE"
  : HasRedex<T> extends true
    ? NormalizeLoop<Step<T>, Pop<Steps>>
    : Render<T>;

/* ------------------------------------------------------------------ *
 * Public entry point
 * ------------------------------------------------------------------ */

export type Normalize<S extends string> = ParseTerm<Strip<S>, ""> extends [infer Term, infer Rest extends string]
  ? Rest extends ""
    ? NormalizeLoop<Term, StepBudget>
    : never
  : never;
