/**
 * Compile-time grader for challenge 07 (type-level lambda normaliser).
 *
 * Usage:
 *   npx tsx grader/grade.ts <pathToSolution>
 *
 * `pathToSolution` may be a directory (we look for solution.ts) or a file. It
 * must export `export type Normalize<S extends string>`.
 *
 * The grader copies the candidate solution and the ground-truth `spec.ts` into
 * a temp directory and runs `tsgo --noEmit --strict`. The challenge passes iff
 * tsgo reports zero errors.
 *
 * NOTE: this is the frontier challenge — no type-level reference solution is
 * shipped. With no argument the grader only verifies that the runtime
 * specification is self-consistent (see selfcheck.ts) and explains that a
 * candidate solution is required to grade.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, copyFileSync, statSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";

function resolveSolution(arg: string): string {
  const p = resolve(arg);
  try {
    if (statSync(p).isDirectory()) return resolve(p, "solution.ts");
  } catch {
    /* use as-is */
  }
  return p;
}

const here = import.meta.dirname;
const arg = process.argv[2];

if (!arg) {
  console.log(
    "challenge 07 is the frontier challenge: no type-level reference solution is shipped.",
  );
  console.log("Provide a candidate: npx tsx grader/grade.ts <your-result-folder>");
  console.log("Verifying the runtime specification is self-consistent instead...\n");
  const res = spawnSync("npx", ["tsx", resolve(here, "selfcheck.ts")], {
    encoding: "utf8",
  });
  process.stdout.write(res.stdout ?? "");
  process.stderr.write(res.stderr ?? "");
  process.exit(res.status ?? 1);
}

const solution = resolveSolution(arg);
if (!existsSync(solution)) {
  console.error(`solution not found: ${solution}`);
  process.exit(2);
}

const work = mkdtempSync(resolve(tmpdir(), "ch07-"));
try {
  copyFileSync(solution, resolve(work, "solution.ts"));
  copyFileSync(resolve(here, "spec.ts"), resolve(work, "spec.ts"));

  const res = spawnSync(
    "npx",
    [
      "tsgo",
      "--noEmit",
      "--strict",
      "--target",
      "ES2024",
      "--module",
      "NodeNext",
      "--moduleResolution",
      "NodeNext",
      resolve(work, "spec.ts"),
    ],
    { encoding: "utf8" },
  );

  const out = `${res.stdout ?? ""}${res.stderr ?? ""}`.trim();
  console.log(`Grading: ${solution}`);
  if (out) console.log(out);
  const ok = res.status === 0;
  console.log(`\nResult: ${ok ? "ALL ASSERTIONS PASS" : "FAILED"}`);
  process.exit(ok ? 0 : 1);
} finally {
  rmSync(work, { recursive: true, force: true });
}
