/**
 * Type-level Untyped Lambda Calculus Normaliser
 *
 * Implements full normal-order beta-reduction to canonical de Bruijn form:
 * 1. Tokenizer: Lexes string into lambda symbols, dots, parentheses, and variable names.
 * 2. Scoped Parser: Parses named terms into de Bruijn indexed AST terms.
 * 3. De Bruijn Calculus:
 *    - Free variable shifting: shift1(cutoff, term)
 *    - Single-variable substitution: subst(varIdx, replacement, target)
 * 4. Normal-Order Reduction: Leftmost-outermost redex contract with bounded step count.
 * 5. Canonical Formatter: Serializes reduced de Bruijn AST to canonical string representation.
 */

export type LowercaseLetter =
  | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j'
  | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't'
  | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';

// --- Stage 1: Tokenizer ---
type Tokenize<S extends string, Acc extends unknown[] = []> =
  S extends `${infer C}${infer Rest}`
    ? C extends ' ' | '\t' | '\n' | '\r'
      ? Tokenize<Rest, Acc>
      : C extends '\\' | '.' | '(' | ')' | LowercaseLetter
        ? Tokenize<Rest, [...Acc, C]>
        : Tokenize<Rest, Acc>
    : Acc;

// --- Stage 2: AST Node Types ---
export type Var<I extends number> = { t: 'var'; i: I };
export type Abs<B> = { t: 'abs'; b: B };
export type App<F, A> = { t: 'app'; f: F; a: A };

type IndexOf<Env extends string[], V extends string, Acc extends unknown[] = []> =
  Env extends [infer H, ...infer Rest extends string[]]
    ? H extends V
      ? Acc['length'] & number
      : IndexOf<Rest, V, [...Acc, unknown]>
    : never;

// --- Stage 3: Type-level Peano / Tuple Arithmetic ---
type BuildTuple<L extends number, T extends unknown[] = []> =
  T['length'] extends L ? T : BuildTuple<L, [...T, unknown]>;

type Inc<N extends number> = [...BuildTuple<N>, unknown]['length'] & number;
type Dec<N extends number> = BuildTuple<N> extends [unknown, ...infer R] ? R['length'] & number : 0;
type Gte<A extends number, B extends number> =
  BuildTuple<A> extends [...BuildTuple<B>, ...unknown[]] ? true : false;

// --- Stage 4: Shifting & Capture-Avoiding Substitution ---
type Shift1Var<C extends number, I extends number> = Gte<I, C> extends true ? Inc<I> : I;

type Shift1<C extends number, T> =
  T extends Var<infer I>
    ? Var<Shift1Var<C, I>>
    : T extends Abs<infer B>
      ? Abs<Shift1<Inc<C>, B>>
      : T extends App<infer F, infer A>
        ? App<Shift1<C, F>, Shift1<C, A>>
        : T;

type SubstVar<J extends number, S, I extends number> =
  I extends J
    ? S
    : Gte<I, Inc<J>> extends true
      ? Var<Dec<I>>
      : Var<I>;

type Subst<J extends number, S, T> =
  T extends Var<infer I>
    ? SubstVar<J, S, I>
    : T extends Abs<infer B>
      ? Abs<Subst<Inc<J>, Shift1<0, S>, B>>
      : T extends App<infer F, infer A>
        ? App<Subst<J, S, F>, Subst<J, S, A>>
        : T;

// --- Stage 5: Normal-Order Reduction Step ---
type Step<T> =
  T extends App<infer F, infer A>
    ? F extends Abs<infer B>
      // Leftmost-outermost redex found: beta-reduce immediately
      ? [Subst<0, A, B>, true]
      : Step<F> extends [infer FPrime, true]
        ? [App<FPrime, A>, true]
        : Step<A> extends [infer APrime, true]
          ? [App<F, APrime>, true]
          : [T, false]
    : T extends Abs<infer B>
      ? Step<B> extends [infer BPrime, true]
        ? [Abs<BPrime>, true]
        : [T, false]
      : [T, false];

type StepLimit = BuildTuple<100>;

type ReduceLoop<T, StepsLeft extends unknown[]> =
  StepsLeft extends [unknown, ...infer RestSteps]
    ? Step<T> extends [infer Next, infer DidStep]
      ? DidStep extends true
        ? ReduceLoop<Next, RestSteps>
        : T
      : T
    : 'DIVERGE';

// --- Stage 6: Canonical de Bruijn String Formatting ---
type Format<T> =
  T extends 'DIVERGE'
    ? 'DIVERGE'
    : T extends Var<infer I>
      ? `${I}`
      : T extends Abs<infer B>
        ? `\\.${Format<B>}`
        : T extends App<infer F, infer A>
          ? `(${Format<F>} ${Format<A>})`
          : never;

// --- Stage 7: Recursive Descent Parser ---
type ParseAtom<Env extends string[], Tokens extends unknown[]> =
  Tokens extends ['\\', infer V extends LowercaseLetter, '.', ...infer Rest]
    ? ParseTerm<[V, ...Env], Rest> extends [infer B, infer RestAfterBody extends unknown[]]
      ? [Abs<B>, RestAfterBody]
      : never
    : Tokens extends ['(', ...infer Rest]
      ? ParseTerm<Env, Rest> extends [infer Inner, infer RestAfterInner extends unknown[]]
        ? RestAfterInner extends [')', ...infer AfterParen extends unknown[]]
          ? [Inner, AfterParen]
          : never
        : never
      : Tokens extends [infer V extends LowercaseLetter, ...infer Rest]
        ? [Var<IndexOf<Env, V>>, Rest]
        : never;

type ParseAppRest<Env extends string[], Acc, Tokens extends unknown[]> =
  Tokens extends []
    ? [Acc, Tokens]
    : Tokens extends [')', ...unknown[]]
      ? [Acc, Tokens]
      : ParseAtom<Env, Tokens> extends [infer NextAtom, infer RestAfterAtom extends unknown[]]
        ? ParseAppRest<Env, App<Acc, NextAtom>, RestAfterAtom>
        : never;

type ParseTerm<Env extends string[], Tokens extends unknown[]> =
  ParseAtom<Env, Tokens> extends [infer FirstAtom, infer Rest extends unknown[]]
    ? ParseAppRest<Env, FirstAtom, Rest>
    : never;

/**
 * Normalises a closed lambda calculus expression string to its canonical beta-normal de Bruijn representation.
 */
export type Normalize<S extends string> =
  ParseTerm<[], Tokenize<S>> extends [infer T, unknown[]]
    ? Format<ReduceLoop<T, StepLimit>>
    : never;
