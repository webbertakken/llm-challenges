/**
 * Verifies the challenge infrastructure stays valid: every grader runs and its
 * reference solution scores a perfect pass. This guards the *challenges*, not
 * the benchmark result folders (those are artifacts and may intentionally
 * fail). Runs locally and in CI.
 *
 *   npx tsx scripts/verify-challenges.ts
 */
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

interface Check {
  readonly name: string;
  readonly cwd: string;
  readonly cmd: readonly string[];
}

const checks: readonly Check[] = [
  {
    name: "challenge04 grader vs reference (expect 9/9)",
    cwd: resolve(root, "challenge04-bug-hunt"),
    cmd: ["tsx", "grader/grade.ts", "grader/reference-fixed.ts"],
  },
  {
    name: "challenge04 buggy toolkit must NOT pass (negative control)",
    cwd: resolve(root, "challenge04-bug-hunt"),
    cmd: ["tsx", "grader/grade.ts", "toolkit.ts"],
  },
  {
    name: "challenge05 grader vs reference (expect EQUIVALENT)",
    cwd: resolve(root, "challenge05-reverse-engineer"),
    cmd: ["tsx", "grader/grade.ts", "grader/reference-solution.ts"],
  },
  {
    name: "challenge06 grader vs reference (expect ALL ASSERTIONS PASS)",
    cwd: resolve(root, "challenge06-type-eval"),
    cmd: ["tsx", "grader/grade.ts", "grader/reference-solution.ts"],
  },
  {
    name: "challenge07 runtime spec self-consistency (selfcheck)",
    cwd: resolve(root, "challenge07-type-lambda"),
    cmd: ["tsx", "grader/selfcheck.ts"],
  },
];

// Checks whose reference is the *buggy* fixture must fail; all others must pass.
const mustFail = new Set(["challenge04 buggy toolkit must NOT pass (negative control)"]);

let failures = 0;
for (const check of checks) {
  const res = spawnSync("npx", check.cmd as string[], {
    cwd: check.cwd,
    encoding: "utf8",
  });
  const exit = res.status ?? 1;
  const expectFail = mustFail.has(check.name);
  const ok = expectFail ? exit !== 0 : exit === 0;
  if (!ok) {
    failures++;
    console.error(`FAIL  ${check.name}`);
    process.stderr.write(`${res.stdout ?? ""}${res.stderr ?? ""}\n`);
  } else {
    console.log(`PASS  ${check.name}`);
  }
}

console.log(`\n${checks.length - failures}/${checks.length} infrastructure checks passed`);
process.exit(failures === 0 ? 0 : 1);
