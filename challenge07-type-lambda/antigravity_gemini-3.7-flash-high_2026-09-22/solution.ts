/**
 * Challenge 07 — Type-level Lambda Calculus Normaliser
 *
 * Implements tokenization, recursive descent parsing, De Bruijn index conversion,
 * capture-avoiding substitution, normal-order reduction with step bounds, and
 * canonical de Bruijn rendering entirely in the TypeScript type system.
 */

// ==========================================
// 1. Natural Number & Tuple Arithmetic Helpers
// ==========================================

type BuildTuple<N extends number, T extends unknown[] = []> =
  T["length"] extends N ? T : BuildTuple<N, [unknown, ...T]>;

type Inc<N extends number> = [...BuildTuple<N>, unknown]["length"] & number;

type Dec<N extends number> =
  BuildTuple<N> extends [unknown, ...infer Rest]
    ? Rest["length"] & number
    : 0;

type AddN<A extends number, B extends number> =
  [...BuildTuple<A>, ...BuildTuple<B>]["length"] & number;

type Compare<A extends number, B extends number> =
  A extends B
    ? "eq"
    : BuildTuple<A> extends [...BuildTuple<B>, ...unknown[]]
    ? "gt"
    : "lt";

// ==========================================
// 2. Tokenizer
// ==========================================

type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

type Whitespace = " " | "\t" | "\n" | "\r";

type Token =
  | { type: "\\" }
  | { type: "." }
  | { type: "(" }
  | { type: ")" }
  | { type: "var"; name: Letter };

type Tokenize<S extends string, Acc extends Token[] = []> =
  S extends `${Whitespace}${infer Rest}`
    ? Tokenize<Rest, Acc>
    : S extends `\\${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: "\\" }]>
    : S extends `.${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: "." }]>
    : S extends `(${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: "(" }]>
    : S extends `)${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: ")" }]>
    : S extends `${infer L extends Letter}${infer Rest}`
    ? Tokenize<Rest, [...Acc, { type: "var"; name: L }]>
    : S extends ""
    ? Acc
    : never;

// ==========================================
// 3. Named AST & Parser
// ==========================================

type NamedTerm =
  | { tag: "var"; name: string }
  | { tag: "abs"; param: string; body: NamedTerm }
  | { tag: "app"; fn: NamedTerm; arg: NamedTerm };

type ParseAtom<Tokens extends Token[]> =
  Tokens extends [
    { type: "\\" },
    { type: "var"; name: infer P extends string },
    { type: "." },
    ...infer Rest extends Token[]
  ]
    ? ParseTerm<Rest> extends [infer B extends NamedTerm, infer RestAfterBody extends Token[]]
      ? [{ tag: "abs"; param: P; body: B }, RestAfterBody]
      : never
    : Tokens extends [{ type: "(" }, ...infer Rest extends Token[]]
    ? ParseTerm<Rest> extends [infer Inner extends NamedTerm, [{ type: ")" }, ...infer RestAfterParen extends Token[]]]
      ? [Inner, RestAfterParen]
      : never
    : Tokens extends [{ type: "var"; name: infer N extends string }, ...infer Rest extends Token[]]
    ? [{ tag: "var"; name: N }, Rest]
    : never;

type ParseAppLoop<Fn extends NamedTerm, Tokens extends Token[]> =
  Tokens extends [infer First extends Token, ...infer _]
    ? First["type"] extends "\\" | "(" | "var"
      ? ParseAtom<Tokens> extends [infer Arg extends NamedTerm, infer RestTokens extends Token[]]
        ? ParseAppLoop<{ tag: "app"; fn: Fn; arg: Arg }, RestTokens>
        : never
      : [Fn, Tokens]
    : [Fn, Tokens];

type ParseApp<Tokens extends Token[]> =
  ParseAtom<Tokens> extends [infer First extends NamedTerm, infer RestTokens extends Token[]]
    ? ParseAppLoop<First, RestTokens>
    : never;

type ParseTerm<Tokens extends Token[]> = ParseApp<Tokens>;

// ==========================================
// 4. De Bruijn Conversion
// ==========================================

export type DBTerm =
  | { tag: "var"; index: number }
  | { tag: "abs"; body: DBTerm }
  | { tag: "app"; fn: DBTerm; arg: DBTerm };

type IndexOf<Env extends string[], Target extends string, Acc extends unknown[] = []> =
  Env extends [infer Head, ...infer Tail extends string[]]
    ? Head extends Target
      ? Acc["length"] & number
      : IndexOf<Tail, Target, [unknown, ...Acc]>
    : never;

type ToDeBruijn<T extends NamedTerm, Env extends string[] = []> =
  T extends { tag: "var"; name: infer N extends string }
    ? { tag: "var"; index: IndexOf<Env, N> }
    : T extends { tag: "abs"; param: infer P extends string; body: infer B extends NamedTerm }
    ? { tag: "abs"; body: ToDeBruijn<B, [P, ...Env]> }
    : T extends { tag: "app"; fn: infer F extends NamedTerm; arg: infer A extends NamedTerm }
    ? { tag: "app"; fn: ToDeBruijn<F, Env>; arg: ToDeBruijn<A, Env> }
    : never;

// ==========================================
// 5. De Bruijn Shifting & Substitution
// ==========================================

type Shift<T extends DBTerm, D extends number, C extends number = 0> =
  T extends { tag: "var"; index: infer K extends number }
    ? Compare<K, C> extends "lt"
      ? { tag: "var"; index: K }
      : { tag: "var"; index: AddN<K, D> }
    : T extends { tag: "abs"; body: infer B extends DBTerm }
    ? { tag: "abs"; body: Shift<B, D, Inc<C>> }
    : T extends { tag: "app"; fn: infer F extends DBTerm; arg: infer A extends DBTerm }
    ? { tag: "app"; fn: Shift<F, D, C>; arg: Shift<A, D, C> }
    : T;

type Substitute<T extends DBTerm, J extends number, S extends DBTerm> =
  T extends { tag: "var"; index: infer K extends number }
    ? Compare<K, J> extends "eq"
      ? Shift<S, J, 0>
      : Compare<K, J> extends "gt"
      ? { tag: "var"; index: Dec<K> }
      : { tag: "var"; index: K }
    : T extends { tag: "abs"; body: infer B extends DBTerm }
    ? { tag: "abs"; body: Substitute<B, Inc<J>, S> }
    : T extends { tag: "app"; fn: infer F extends DBTerm; arg: infer A extends DBTerm }
    ? { tag: "app"; fn: Substitute<F, J, S>; arg: Substitute<A, J, S> }
    : T;

// ==========================================
// 6. Normal-Order Reduction (Leftmost-Outermost)
// ==========================================

type Step<T extends DBTerm> =
  T extends { tag: "app"; fn: { tag: "abs"; body: infer B extends DBTerm }; arg: infer A extends DBTerm }
    ? { reduced: true; term: Substitute<B, 0, A> }
    : T extends { tag: "app"; fn: infer F extends DBTerm; arg: infer A extends DBTerm }
    ? Step<F> extends { reduced: true; term: infer FPrime extends DBTerm }
      ? { reduced: true; term: { tag: "app"; fn: FPrime; arg: A } }
      : Step<A> extends { reduced: true; term: infer APrime extends DBTerm }
      ? { reduced: true; term: { tag: "app"; fn: F; arg: APrime } }
      : { reduced: false; term: T }
    : T extends { tag: "abs"; body: infer B extends DBTerm }
    ? Step<B> extends { reduced: true; term: infer BPrime extends DBTerm }
      ? { reduced: true; term: { tag: "abs"; body: BPrime } }
      : { reduced: false; term: T }
    : { reduced: false; term: T };

type ReduceLoop<T extends DBTerm, Fuel extends unknown[]> =
  Fuel extends [unknown, ...infer RestFuel]
    ? Step<T> extends { reduced: true; term: infer Next extends DBTerm }
      ? ReduceLoop<Next, RestFuel>
      : T
    : "DIVERGE";

// ==========================================
// 7. Canonical Output Formatting
// ==========================================

type Render<T> =
  [T] extends [{ tag: "var"; index: infer K extends number }]
    ? `${K}`
    : [T] extends [{ tag: "abs"; body: infer B }]
    ? `\\.${Render<B>}`
    : [T] extends [{ tag: "app"; fn: infer F; arg: infer A }]
    ? `(${Render<F>} ${Render<A>})`
    : "";

/**
 * Normalises a closed lambda calculus expression string to its canonical
 * de Bruijn beta-normal form, or "DIVERGE" if reduction limit is reached.
 */
export type Normalize<S extends string> =
  ParseTerm<Tokenize<S>> extends [infer T extends NamedTerm, []]
    ? ToDeBruijn<T> extends infer DB extends DBTerm
      ? ReduceLoop<DB, BuildTuple<100>> extends infer Res
        ? Res extends "DIVERGE"
          ? "DIVERGE"
          : Render<Res>
        : never
      : never
    : never;
