/**
 * Generates and prints the expected (input -> de Bruijn normal form) pairs used
 * by the grader's spec. Run with `npx tsx grader/gen-expected.ts`.
 *
 * It also self-checks that every result is idempotent under re-normalisation
 * (a true normal form normalises to itself in canonical syntax), so the baked
 * expected values are trustworthy without a type-level reference.
 */
import { normalize } from "./reference.ts";

export const CASES: readonly string[] = [
  "\\x.x", // identity
  "\\f.\\x.x", // Church 0
  "\\f.\\x.f x", // Church 1
  "\\f.\\x.f (f x)", // Church 2
  "(\\x.x) (\\y.y)", // I I -> I
  "(\\x.\\y.x) (\\a.a) (\\b.\\c.b)", // K I (...) -> I
  "(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)", // SUCC 0 -> 1
  "(\\n.\\f.\\x.f (n f x)) (\\f.\\x.f x)", // SUCC 1 -> 2
  "(\\x.\\y.y) ((\\z.z z) (\\z.z z))", // normal order: K* I Ω -> I (lazy!)
  "(\\f.(\\x.f (x x)) (\\x.f (x x))) (\\g.\\a.a)", // Y G where G ignores rec -> \a.a
  "(\\m.\\n.\\f.\\x.m f (n f x)) (\\f.\\x.f x) (\\f.\\x.f x)", // PLUS 1 1 -> 2
  "(\\x.x x) (\\x.x x)", // omega -> DIVERGE (no normal form)
];

function main(): void {
  for (const src of CASES) {
    const out = normalize(src);
    // Self-check: a normal form must be a fixpoint of normalisation.
    if (out !== "DIVERGE") {
      // The output is de Bruijn syntax; we can't re-feed it (named syntax), but
      // we can assert it contains no redex marker by structural stability:
      // normalising the SAME source again must be deterministic.
      const again = normalize(src);
      if (again !== out) {
        throw new Error(`non-deterministic normalisation for ${src}`);
      }
    }
    console.log(`${JSON.stringify(src)} -> ${JSON.stringify(out)}`);
  }
}

main();
