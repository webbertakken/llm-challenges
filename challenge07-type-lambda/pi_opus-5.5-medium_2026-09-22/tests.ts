import type { Normalize } from "./solution.js";

type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Church-encoding building blocks (named syntax).
type Zero = "(\\f.\\x.x)";
type One = "(\\f.\\x.f x)";
type TwoC = "(\\f.\\x.f (f x))";
type Three = "(\\f.\\x.f (f (f x)))";
type Plus = "(\\m.\\n.\\f.\\x.m f (n f x))";
type Mult = "(\\m.\\n.\\f.m (n f))";
type Pow = "(\\b.\\e.e b)";
type Pred = "(\\n.\\f.\\x.n (\\g.\\h.h (g f)) (\\u.x) (\\u.u))";
type Y = "(\\f.(\\x.f (x x)) (\\x.f (x x)))";
type IsZero = "(\\n.n (\\x.\\a.\\b.b) (\\a.\\b.a))";
type Fact = `(${Y} (\\r.\\n.${IsZero} n ${One} (${Mult} n (r (${Pred} n)))))`;

type C5 = "\\.\\.(1 (1 (1 (1 (1 0)))))";
type C6 = "\\.\\.(1 (1 (1 (1 (1 (1 0))))))";
type C8 = "\\.\\.(1 (1 (1 (1 (1 (1 (1 (1 0))))))))";

/** Renders the body of Church numeral N in de Bruijn form: (1 (1 ... 0)). */
type Nest<N extends number, Acc extends string = "0", I extends 0[] = []> = I["length"] extends N
  ? Acc
  : Nest<N, `(1 ${Acc})`, [...I, 0]>;

export type Tests = [
  Expect<Equals<Normalize<"\\x.x">, "\\.0">>,
  Expect<Equals<Normalize<"\\f.\\x.f (f x)">, "\\.\\.(1 (1 0))">>,
  Expect<Equals<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, "\\.\\.(1 0)">>,
  Expect<Equals<Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">, "\\.0">>,
  Expect<Equals<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">>,
  Expect<Equals<Normalize<Zero>, "\\.\\.0">>,
  Expect<Equals<Normalize<" ( \\x . x )  ( \\y . y ) ">, "\\.0">>,
  Expect<Equals<Normalize<"\\x.\\y.\\z.x z (y z)">, "\\.\\.\\.((2 0) (1 0))">>,
  // Left-associative application and maximal abstraction bodies.
  Expect<Equals<Normalize<"\\a.\\b.\\c.a b c">, "\\.\\.\\.((2 1) 0)">>,
  Expect<Equals<Normalize<"\\a.\\b.\\c.a (b c)">, "\\.\\.\\.(2 (1 0))">>,
  Expect<Equals<Normalize<"\\x.x \\y.y x">, "\\.(0 \\.(0 1))">>,
  // Shadowing and alpha-equivalence.
  Expect<Equals<Normalize<"\\x.\\x.x">, "\\.\\.0">>,
  Expect<Equals<Normalize<"\\a.\\b.a">, Normalize<"\\p.\\q.p">>>,
  // Capture avoidance: the argument's free variable must not be captured by the inner binder.
  Expect<Equals<Normalize<"\\y.(\\x.\\y.x) y">, "\\.\\.1">>,
  Expect<Equals<Normalize<"\\z.\\y.(\\x.\\y.x y z) y">, "\\.\\.\\.((1 0) 2)">>,
  // Reduction under binders.
  Expect<Equals<Normalize<"\\x.(\\y.y) x">, "\\.0">>,
  Expect<Equals<Normalize<"\\x.x ((\\y.y) x)">, "\\.(0 0)">>,
  // Combinators.
  Expect<Equals<Normalize<"(\\x.\\y.\\z.x z (y z)) (\\x.\\y.x) (\\x.\\y.x)">, "\\.0">>,
  Expect<Equals<Normalize<`${Y} (\\f.\\x.x)`>, "\\.0">>,
  // Church arithmetic.
  Expect<Equals<Normalize<`${Plus} ${TwoC} ${Three}`>, C5>>,
  Expect<Equals<Normalize<`${Mult} ${TwoC} ${Three}`>, C6>>,
  Expect<Equals<Normalize<`${Pow} ${TwoC} ${Three}`>, C8>>,
  Expect<Equals<Normalize<`${Pow} ${TwoC} (\\f.\\x.f (f (f (f (f x)))))`>, `\\.\\.${Nest<32>}`>>,
  Expect<Equals<Normalize<`${Pow} ${Three} ${Three}`>, `\\.\\.${Nest<27>}`>>,
  Expect<Equals<Normalize<`${Pred} ${Three}`>, "\\.\\.(1 (1 0))">>,
  Expect<Equals<Normalize<`${Pred} ${Zero}`>, "\\.\\.0">>,
  Expect<Equals<Normalize<`${Fact} ${Three}`>, C6>>,
];
