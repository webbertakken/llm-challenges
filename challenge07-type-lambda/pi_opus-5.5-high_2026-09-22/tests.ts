import type { Normalize, Parse } from "./solution.js";

type Equals<A, B> = (<X>() => X extends A ? 1 : 2) extends <X>() => X extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

// Church encodings used below (named source syntax).
type Zero = "(\\f.\\x.x)";
type One = "(\\f.\\x.f x)";
type Two = "(\\f.\\x.f (f x))";
type Three = "(\\f.\\x.f (f (f x)))";
type Succ = "(\\n.\\f.\\x.f (n f x))";
type Plus = "(\\m.\\n.\\f.\\x.m f (n f x))";
type Mult = "(\\m.\\n.\\f.m (n f))";
type Pred = "(\\n.\\f.\\x.n (\\g.\\h.h (g f)) (\\u.x) (\\u.u))";
type True = "(\\t.\\f.t)";
type False = "(\\t.\\f.f)";
type IsZero = `(\\n.n (\\x.${False}) ${True})`;
type Y = "(\\f.(\\x.f (x x)) (\\x.f (x x)))";
type S = "(\\x.\\y.\\z.x z (y z))";
type K = "(\\x.\\y.x)";
type Omega = "((\\x.x x) (\\x.x x))";

type Church<N extends string> = N;
type C0 = Church<"\\.\\.0">;
type C1 = Church<"\\.\\.(1 0)">;
type C2 = Church<"\\.\\.(1 (1 0))">;
type C3 = Church<"\\.\\.(1 (1 (1 0)))">;
type C5 = Church<"\\.\\.(1 (1 (1 (1 (1 0)))))">;
type C6 = Church<"\\.\\.(1 (1 (1 (1 (1 (1 0))))))">;
type C8 = Church<"\\.\\.(1 (1 (1 (1 (1 (1 (1 (1 0))))))))">;
type C9 = Church<"\\.\\.(1 (1 (1 (1 (1 (1 (1 (1 (1 0)))))))))">;

export type Tests = [
  // README examples
  Expect<Equals<Normalize<"\\x.x">, "\\.0">>,
  Expect<Equals<Normalize<"\\f.\\x.f (f x)">, C2>>,
  Expect<Equals<Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)">, C1>>,
  Expect<Equals<Normalize<"(\\x.\\y.y) ((\\z.z z) (\\z.z z))">, "\\.0">>,
  Expect<Equals<Normalize<"(\\x.x x) (\\x.x x)">, "DIVERGE">>,

  // Parsing: application is left-associative, lambda bodies extend right, whitespace is free
  Expect<Equals<Normalize<"\\x.\\y.\\z.x y z">, "\\.\\.\\.((2 1) 0)">>,
  Expect<Equals<Normalize<"\\x.\\y.\\z.x (y z)">, "\\.\\.\\.(2 (1 0))">>,
  Expect<Equals<Normalize<"\\x.x \\y.y x">, "\\.(0 \\.(0 1))">>,
  Expect<Equals<Normalize<"  ( \\ x . x )  ">, "\\.0">>,
  Expect<Equals<Normalize<"(((\\x.x)))">, "\\.0">>,
  Expect<Equals<Normalize<"\\a.\\b.(a) (b)">, "\\.\\.(1 0)">>,
  Expect<Equals<Parse<"\\x.x">, ["lam", [], true, ["var", [1], true, []]]>>,

  // Alpha-equivalence: names do not matter, shadowing resolves to the nearest binder
  Expect<Equals<Normalize<"\\a.\\b.a">, Normalize<"\\x.\\y.x">>>,
  Expect<Equals<Normalize<"\\x.\\x.x">, "\\.\\.0">>,
  Expect<Equals<Normalize<"\\x.(\\x.x) x">, "\\.0">>,
  Expect<Equals<Normalize<"\\x.\\y.(\\x.x y) x">, "\\.\\.(1 0)">>,

  // Capture avoidance: substituting a free variable under a binder of the same name
  Expect<Equals<Normalize<"\\y.(\\x.\\y.x) y">, "\\.\\.1">>,
  Expect<Equals<Normalize<"\\a.\\b.(\\x.\\y.x y) b">, "\\.\\.\\.(1 0)">>,
  Expect<Equals<Normalize<"\\z.(\\x.\\y.\\w.x y w) (\\q.z q)">, "\\.\\.\\.((2 1) 0)">>,

  // Reduction under binders and nested redexes
  Expect<Equals<Normalize<"\\x.(\\y.y) x">, "\\.0">>,
  Expect<Equals<Normalize<"\\f.(\\x.f x) ((\\y.y) f)">, "\\.(0 0)">>,
  Expect<Equals<Normalize<`${S} ${K} ${K}`>, "\\.0">>,
  Expect<Equals<Normalize<`${S} ${K} ${S}`>, "\\.0">>,

  // Normal order: discarded arguments may diverge
  Expect<Equals<Normalize<`${K} (\\x.x) ${Omega}`>, "\\.0">>,
  Expect<Equals<Normalize<`${False} ${Omega} ${True}`>, "\\.\\.1">>,
  Expect<Equals<Normalize<`\\y.${K} y ${Omega}`>, "\\.0">>,

  // Church arithmetic
  Expect<Equals<Normalize<Zero>, C0>>,
  Expect<Equals<Normalize<`${Succ} ${Two}`>, C3>>,
  Expect<Equals<Normalize<`${Plus} ${Two} ${Three}`>, C5>>,
  Expect<Equals<Normalize<`${Mult} ${Two} ${Three}`>, C6>>,
  Expect<Equals<Normalize<`${Three} ${Two}`>, C8>>, // 2^3
  Expect<Equals<Normalize<`${Two} ${Three}`>, C9>>, // 3^2
  Expect<Equals<Normalize<`${Pred} ${Three}`>, C2>>,
  Expect<Equals<Normalize<`${Pred} ${Zero}`>, C0>>,
  Expect<Equals<Normalize<`${Mult} (${Plus} ${One} ${Two}) (${Pred} ${Three})`>, C6>>,

  // Booleans
  Expect<Equals<Normalize<`${IsZero} ${Zero}`>, "\\.\\.1">>,
  Expect<Equals<Normalize<`${IsZero} ${Two}`>, "\\.\\.0">>,

  // Recursion through the Y combinator: factorial 3 = 6
  Expect<
    Equals<
      Normalize<`${Y} (\\r.\\n.${IsZero} n ${One} (${Mult} n (r (${Pred} n)))) ${Three}`>,
      C6
    >
  >,

  // Divergence
  Expect<Equals<Normalize<Omega>, "DIVERGE">>,
  Expect<Equals<Normalize<`\\x.${Omega}`>, "DIVERGE">>,
  Expect<Equals<Normalize<`${Y} (\\x.x)`>, "DIVERGE">>,

  // Malformed or open input
  Expect<Equals<Normalize<"x">, never>>,
  Expect<Equals<Normalize<"\\x.y">, never>>,
  Expect<Equals<Normalize<"(\\x.x">, never>>,
  Expect<Equals<Normalize<"\\x.x)">, never>>,
  Expect<Equals<Normalize<"\\x.">, never>>,
  Expect<Equals<Normalize<"()">, never>>,
  Expect<Equals<Normalize<"">, never>>,
];
