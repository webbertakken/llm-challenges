/**
 * Behavioural grader for challenge 04 (bug hunt).
 *
 * Usage:
 *   npx tsx grader/grade.ts [pathToSolution]
 *
 * `pathToSolution` may be a directory (we look for fixed.ts) or a file.
 * Defaults to the reference solution in this folder.
 *
 * It exercises every exported function against its documented contract and
 * prints a per-function PASS/FAIL plus a final score. Exit code is 0 only when
 * every function behaves correctly.
 */
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { statSync } from "node:fs";

type Toolkit = typeof import("./reference-fixed.ts");

const eq = (a: unknown, b: unknown): boolean =>
  JSON.stringify(a) === JSON.stringify(b);

/** A check returns true on correct behaviour. Throwing counts as a failure. */
const makeChecks = (mod: Toolkit): Record<string, () => boolean | Promise<boolean>> => ({
  isLeapYear: () =>
    mod.isLeapYear(2000) === true &&
    mod.isLeapYear(1900) === false &&
    mod.isLeapYear(2024) === true &&
    mod.isLeapYear(2023) === false &&
    mod.isLeapYear(2400) === true,

  clamp: () =>
    mod.clamp(5, 0, 10) === 5 &&
    mod.clamp(-3, 0, 10) === 0 &&
    mod.clamp(99, 0, 10) === 10,

  chunk: () => {
    const src = [1, 2, 3, 4, 5];
    const out = mod.chunk(src, 2);
    return (
      eq(out, [[1, 2], [3, 4], [5]]) &&
      eq(mod.chunk([1, 2, 3, 4], 2), [[1, 2], [3, 4]]) &&
      eq(mod.chunk([1], 3), [[1]]) &&
      eq(src, [1, 2, 3, 4, 5]) // input untouched
    );
  },

  median: () => {
    const src = [3, 1, 2];
    return (
      mod.median(src) === 2 &&
      mod.median([1, 2, 3, 4]) === 2.5 &&
      mod.median([10, 2, 33, 4]) === 7 && // numeric, not lexicographic, sort
      mod.median([5]) === 5 &&
      eq(src, [3, 1, 2]) // input untouched
    );
  },

  dedupe: () =>
    eq(mod.dedupe([1, 1, 2, 3, 3, 1]), [1, 2, 3]) &&
    eq(mod.dedupe(["a", "b", "a"]), ["a", "b"]),

  roundCurrency: () =>
    mod.roundCurrency(1.005) === 1.01 &&
    mod.roundCurrency(2.675) === 2.68 &&
    mod.roundCurrency(1.004) === 1.0 &&
    mod.roundCurrency(19.99) === 19.99 &&
    mod.roundCurrency(0) === 0,

  rangeInclusive: () =>
    eq(mod.rangeInclusive(1, 5), [1, 2, 3, 4, 5]) &&
    eq(mod.rangeInclusive(0, 0), [0]) &&
    eq(mod.rangeInclusive(-2, 1), [-2, -1, 0, 1]),

  groupBy: () => {
    const r1 = mod.groupBy([1, 2, 3, 4], (n) => (n % 2 === 0 ? "even" : "odd"));
    // Keys that collide with Object.prototype members must still work.
    const r2 = mod.groupBy(["toString", "toString", "x"], (s) => s);
    const r3 = mod.groupBy(["constructor"], (s) => s);
    return (
      eq(r1, { odd: [1, 3], even: [2, 4] }) &&
      eq(r2["toString"], ["toString", "toString"]) &&
      eq(r2["x"], ["x"]) &&
      eq(r3["constructor"], ["constructor"])
    );
  },

  mapLimit: async () => {
    let active = 0;
    let peak = 0;
    const fn = async (item: number, index: number): Promise<string> => {
      active++;
      peak = Math.max(peak, active);
      await new Promise((r) => setTimeout(r, 5));
      active--;
      return `${index}:${item * 2}`;
    };
    const out = await mod.mapLimit([10, 20, 30, 40, 50], 2, fn);
    const orderedAndIndexed = eq(out, [
      "0:20",
      "1:40",
      "2:60",
      "3:80",
      "4:100",
    ]);
    const boundedConcurrency = peak <= 2 && peak >= 1;

    // Rejections must propagate.
    let rejected = false;
    try {
      await mod.mapLimit([1, 2, 3], 2, async (n) => {
        if (n === 2) throw new Error("boom");
        return n;
      });
    } catch {
      rejected = true;
    }
    return orderedAndIndexed && boundedConcurrency && rejected;
  },
});

async function main(): Promise<void> {
  const arg =
    process.argv[2] ?? resolve(import.meta.dirname, "reference-fixed.ts");
  const p = resolve(arg);
  let target = p;
  try {
    if (statSync(p).isDirectory()) target = resolve(p, "fixed.ts");
  } catch {
    /* use p as-is */
  }

  const mod: Toolkit = await import(pathToFileURL(target).href);
  const checks = makeChecks(mod);
  const names = Object.keys(checks);
  let passed = 0;
  const rows: string[] = [];
  for (const name of names) {
    let ok = false;
    try {
      ok = await checks[name]!();
    } catch {
      ok = false;
    }
    if (ok) passed++;
    rows.push(`  ${ok ? "PASS" : "FAIL"}  ${name}`);
  }

  console.log(`Grading: ${target}`);
  console.log(rows.join("\n"));
  console.log(`\nScore: ${passed}/${names.length} functions correct`);
  process.exit(passed === names.length ? 0 : 1);
}

void main();
