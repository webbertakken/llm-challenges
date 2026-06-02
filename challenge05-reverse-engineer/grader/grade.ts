/**
 * Equivalence grader for challenge 05 (reverse engineering).
 *
 * Usage:
 *   npx tsx grader/grade.ts [pathToSolution]
 *
 * `pathToSolution` may be a directory (we look for solution.ts, then
 * solution.js/.mjs) or a file. Defaults to the reference solution.
 *
 * The solution must export `solution(input: string): string`. We compare it
 * against the provided mystery function over a battery of edge cases and many
 * random inputs. A perfect solution matches on every input.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { statSync, existsSync } from "node:fs";

type Fn = (input: string) => string;

function resolveTarget(arg: string): string {
  const p = resolve(arg);
  let isDir = false;
  try {
    isDir = statSync(p).isDirectory();
  } catch {
    return p;
  }
  if (!isDir) return p;
  for (const name of ["solution.ts", "solution.js", "solution.mjs"]) {
    const candidate = resolve(p, name);
    if (existsSync(candidate)) return candidate;
  }
  return resolve(p, "solution.ts");
}

function pickFn(mod: Record<string, unknown>): Fn {
  const candidate = mod["solution"] ?? mod["default"];
  if (typeof candidate !== "function") {
    throw new Error("solution module must export `solution(input): string`");
  }
  return candidate as Fn;
}

function randomString(rng: () => number): string {
  const len = Math.floor(rng() * 40);
  const pools = [
    "abcdefghijklmnopqrstuvwxyz",
    "0123456789",
    "AZ!@# \t\n,.",
    "héllo—wörld·名前·🚀🌈",
  ];
  let out = "";
  for (let i = 0; i < len; i++) {
    const pool = pools[Math.floor(rng() * pools.length)]!;
    out += pool[Math.floor(rng() * pool.length)]!;
  }
  return out;
}

// Deterministic PRNG so the grader is reproducible (mulberry32).
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main(): Promise<void> {
  const arg = process.argv[2] ?? resolve(import.meta.dirname, "reference-solution.ts");
  const target = resolveTarget(arg);

  const mysteryMod = await import(
    pathToFileURL(resolve(import.meta.dirname, "..", "mystery.mjs")).href
  );
  const mystery = pickFn(mysteryMod);
  const solutionMod = await import(pathToFileURL(target).href);
  const solution = pickFn(solutionMod);

  const edge = ["", "a", "abc", "123456789", "The quick brown fox", "\u0000\u0000", "café", "🚀", "\n\t ", "0".repeat(1000)];
  const rng = mulberry32(0xc0ffee);
  const random = Array.from({ length: 5000 }, () => randomString(rng));
  const inputs = [...edge, ...random];

  let mismatches = 0;
  const samples: string[] = [];
  for (const input of inputs) {
    const expected = mystery(input);
    let actual: string;
    try {
      actual = solution(input);
    } catch (err) {
      actual = `THREW: ${(err as Error).message}`;
    }
    if (actual !== expected) {
      mismatches++;
      if (samples.length < 5) {
        samples.push(`  input=${JSON.stringify(input)} expected=${expected} got=${actual}`);
      }
    }
  }

  console.log(`Grading: ${target}`);
  console.log(`Inputs tested: ${inputs.length}`);
  console.log(`Mismatches: ${mismatches}`);
  if (samples.length) {
    console.log("Sample mismatches:");
    console.log(samples.join("\n"));
  }
  console.log(`\nResult: ${mismatches === 0 ? "EQUIVALENT" : "NOT EQUIVALENT"}`);
  process.exit(mismatches === 0 ? 0 : 1);
}

void main();
