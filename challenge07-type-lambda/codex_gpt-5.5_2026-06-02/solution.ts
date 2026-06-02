type Nat = readonly unknown[];

type VarName =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";

type Space = " " | "\n" | "\r" | "\t";
type Tok = VarName | "\\" | "." | "(" | ")";

type Tokenize<S extends string, Out extends Tok[] = []> =
  S extends `${infer C}${infer R}`
    ? C extends Space
      ? Tokenize<R, Out>
      : C extends Tok
        ? Tokenize<R, [...Out, C]>
        : never
    : Out;

type Named =
  | readonly ["v", VarName]
  | readonly ["l", VarName, Named]
  | readonly ["a", Named, Named];

type Db =
  | readonly ["v", Nat]
  | readonly ["l", Db]
  | readonly ["a", Db, Db];

type AtomStart<T extends readonly Tok[]> =
  T extends readonly [infer H extends Tok, ...readonly Tok[]]
    ? H extends VarName | "\\" | "(" ? true : false
    : false;

type Parse<T extends readonly Tok[]> = ParseTerm<T> extends readonly [infer A extends Named, []] ? A : never;

type ParseTerm<T extends readonly Tok[]> = ParseApp<T>;

type ParseApp<T extends readonly Tok[]> =
  ParseAtom<T> extends readonly [infer A extends Named, infer R extends Tok[]]
    ? ParseAppTail<A, R>
    : never;

type ParseAppTail<Left extends Named, T extends readonly Tok[]> =
  AtomStart<T> extends true
    ? ParseAtom<T> extends readonly [infer Right extends Named, infer R extends Tok[]]
      ? ParseAppTail<["a", Left, Right], R>
      : never
    : readonly [Left, T];

type ParseAtom<T extends readonly Tok[]> =
  T extends readonly [infer H extends Tok, ...infer R extends Tok[]]
    ? H extends VarName
      ? readonly [["v", H], R]
      : H extends "\\"
        ? R extends readonly [infer V extends VarName, ".", ...infer BodyTokens extends Tok[]]
          ? ParseTerm<BodyTokens> extends readonly [infer Body extends Named, infer Rest extends Tok[]]
            ? readonly [["l", V, Body], Rest]
            : never
          : never
        : H extends "("
          ? ParseTerm<R> extends readonly [infer Inner extends Named, infer Rest extends Tok[]]
            ? Rest extends readonly [")", ...infer After extends Tok[]]
              ? readonly [Inner, After]
              : never
            : never
          : never
    : never;

type IndexOf<Needle extends VarName, Env extends readonly VarName[], Seen extends Nat = []> =
  Env extends readonly [infer H extends VarName, ...infer R extends VarName[]]
    ? H extends Needle
      ? Seen
      : IndexOf<Needle, R, [...Seen, unknown]>
    : never;

type ToDb<T extends Named, Env extends readonly VarName[] = []> =
  T extends readonly ["v", infer V extends VarName]
    ? readonly ["v", IndexOf<V, Env>]
    : T extends readonly ["l", infer V extends VarName, infer B extends Named]
      ? readonly ["l", ToDb<B, [V, ...Env]>]
      : T extends readonly ["a", infer F extends Named, infer A extends Named]
        ? readonly ["a", ToDb<F, Env>, ToDb<A, Env>]
        : never;

type EqNat<A extends Nat, B extends Nat> =
  A extends readonly [unknown, ...infer AR extends Nat]
    ? B extends readonly [unknown, ...infer BR extends Nat]
      ? EqNat<AR, BR>
      : false
    : B extends readonly []
      ? true
      : false;

type Gte<A extends Nat, B extends Nat> =
  B extends readonly []
    ? true
    : A extends readonly [unknown, ...infer AR extends Nat]
      ? B extends readonly [unknown, ...infer BR extends Nat]
        ? Gte<AR, BR>
        : true
      : false;

type Inc<N extends Nat> = [...N, unknown];
type Dec<N extends Nat> = N extends readonly [unknown, ...infer R extends Nat] ? R : [];

type ShiftUp<T extends Db, Cutoff extends Nat = []> =
  T extends readonly ["v", infer N extends Nat]
    ? readonly ["v", Gte<N, Cutoff> extends true ? Inc<N> : N]
    : T extends readonly ["l", infer B extends Db]
      ? readonly ["l", ShiftUp<B, Inc<Cutoff>>]
      : T extends readonly ["a", infer F extends Db, infer A extends Db]
        ? readonly ["a", ShiftUp<F, Cutoff>, ShiftUp<A, Cutoff>]
        : never;

type ShiftDown<T extends Db, Cutoff extends Nat = []> =
  T extends readonly ["v", infer N extends Nat]
    ? readonly ["v", Gte<N, Cutoff> extends true ? Dec<N> : N]
    : T extends readonly ["l", infer B extends Db]
      ? readonly ["l", ShiftDown<B, Inc<Cutoff>>]
      : T extends readonly ["a", infer F extends Db, infer A extends Db]
        ? readonly ["a", ShiftDown<F, Cutoff>, ShiftDown<A, Cutoff>]
        : never;

type Subst<T extends Db, J extends Nat, S extends Db> =
  T extends readonly ["v", infer N extends Nat]
    ? EqNat<N, J> extends true ? S : T
    : T extends readonly ["l", infer B extends Db]
      ? readonly ["l", Subst<B, Inc<J>, ShiftUp<S>>]
      : T extends readonly ["a", infer F extends Db, infer A extends Db]
        ? readonly ["a", Subst<F, J, S>, Subst<A, J, S>]
        : never;

type Beta<Body extends Db, Arg extends Db> = ShiftDown<Subst<Body, [], ShiftUp<Arg>>>;

type StepResult = readonly [false, Db] | readonly [true, Db];

type ReduceOne<T extends Db> =
  T extends readonly ["a", readonly ["l", infer Body extends Db], infer Arg extends Db]
    ? readonly [true, Beta<Body, Arg>]
    : T extends readonly ["a", infer F extends Db, infer A extends Db]
      ? ReduceOne<F> extends readonly [true, infer NF extends Db]
        ? readonly [true, readonly ["a", NF, A]]
        : ReduceOne<A> extends readonly [true, infer NA extends Db]
          ? readonly [true, readonly ["a", F, NA]]
          : readonly [false, T]
      : T extends readonly ["l", infer B extends Db]
        ? ReduceOne<B> extends readonly [true, infer NB extends Db]
          ? readonly [true, readonly ["l", NB]]
          : readonly [false, T]
        : readonly [false, T];

type Fuel = [
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown,
  unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown, unknown
];

type NormaliseDb<T extends Db, F extends readonly unknown[] = Fuel> =
  F extends readonly [unknown, ...infer Rest extends unknown[]]
    ? ReduceOne<T> extends readonly [true, infer Next extends Db]
      ? NormaliseDb<Next, Rest>
      : T
    : "DIVERGE";

type Render<T> =
  T extends "DIVERGE"
    ? "DIVERGE"
    : T extends readonly ["v", infer N extends Nat]
      ? `${N["length"]}`
      : T extends readonly ["l", infer B]
        ? `\\.${Render<B>}`
        : T extends readonly ["a", infer F, infer A]
          ? `(${Render<F>} ${Render<A>})`
          : never;

export type Normalize<S extends string> =
  string extends S ? string : Render<NormaliseDb<ToDb<Parse<Tokenize<S>>>>>;
