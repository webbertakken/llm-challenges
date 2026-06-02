/**
 * Verifies that the runtime reference produces exactly the expected outputs
 * baked into cases.ts (and therefore mirrored in spec.ts). This guards the
 * grader's ground truth without needing a type-level reference solution.
 *
 *   npx tsx grader/selfcheck.ts
 */
import { normalize } from "./reference.ts";
import { CASES } from "./cases.ts";

let failures = 0;
for (const { source, expected } of CASES) {
  const actual = normalize(source);
  const ok = actual === expected;
  if (!ok) failures++;
  console.log(`  ${ok ? "OK  " : "FAIL"} ${JSON.stringify(source)} -> ${JSON.stringify(actual)}${ok ? "" : ` (expected ${JSON.stringify(expected)})`}`);
}
console.log(`\n${CASES.length - failures}/${CASES.length} reference outputs match cases.ts`);
process.exit(failures === 0 ? 0 : 1);
