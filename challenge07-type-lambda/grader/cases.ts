/**
 * The shared input/expected-output pairs for challenge 07.
 *
 * `source` is named-syntax lambda; `expected` is the de Bruijn normal form the
 * runtime reference produces (verified by selfcheck.ts). The type-level
 * grader's spec.ts mirrors these exact pairs as compile-time assertions.
 */
export const CASES: ReadonlyArray<{ source: string; expected: string }> = [
  { source: "\\x.x", expected: "\\.0" },
  { source: "\\f.\\x.x", expected: "\\.\\.0" },
  { source: "\\f.\\x.f x", expected: "\\.\\.(1 0)" },
  { source: "\\f.\\x.f (f x)", expected: "\\.\\.(1 (1 0))" },
  { source: "(\\x.x) (\\y.y)", expected: "\\.0" },
  { source: "(\\x.\\y.x) (\\a.a) (\\b.\\c.b)", expected: "\\.0" },
  { source: "(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)", expected: "\\.\\.(1 0)" },
  { source: "(\\n.\\f.\\x.f (n f x)) (\\f.\\x.f x)", expected: "\\.\\.(1 (1 0))" },
  { source: "(\\x.\\y.y) ((\\z.z z) (\\z.z z))", expected: "\\.0" },
  { source: "(\\f.(\\x.f (x x)) (\\x.f (x x))) (\\g.\\a.a)", expected: "\\.0" },
  {
    source: "(\\m.\\n.\\f.\\x.m f (n f x)) (\\f.\\x.f x) (\\f.\\x.f x)",
    expected: "\\.\\.(1 (1 0))",
  },
  { source: "(\\x.x x) (\\x.x x)", expected: "DIVERGE" },
];
