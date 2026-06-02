/**
 * Compile-time grader for challenge 06 (type-level evaluator).
 *
 * Usage:
 *   npx tsx grader/grade.ts [pathToSolution]
 *
 * `pathToSolution` may be a directory (we look for solution.ts) or a file.
 * Defaults to the reference solution.
 *
 * It copies the candidate solution and the ground-truth `spec.ts` into a temp
 * directory and runs `tsgo --noEmit --strict`. The challenge passes iff tsgo
 * reports zero errors.
 */
import { spawnSync } from "node:child_process";
import { mkdtempSync, copyFileSync, statSync, rmSync } from "node:fs";
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
const arg = process.argv[2] ?? resolve(here, "reference-solution.ts");
const solution = resolveSolution(arg);

const work = mkdtempSync(resolve(tmpdir(), "ch06-"));
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
