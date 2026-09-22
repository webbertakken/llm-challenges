/**
 * Equivalence harness: `solution.ts` vs the obfuscated `mystery.mjs`.
 *
 *   npx tsx equivalence.test.ts
 *
 * Every case runs both implementations on the same input and compares the
 * strings. The suite mixes hand-picked edge cases (empty input, every single
 * byte, astral planes, lone surrogates, known CRC-32 check vectors) with
 * randomised fuzzing across ASCII, full Unicode and raw-ish binary strings.
 */

import { solution } from "./solution.js";

type Mystery = (input: string) => string;

/**
 * `mystery.mjs` is plain JavaScript with no type declarations, so it is loaded
 * through a computed specifier: the module is still resolved at runtime, but
 * the type checker is not asked to type a file it cannot see.
 */
async function loadMystery(): Promise<Mystery> {
  // Resolved at runtime relative to this file, in both CJS and ESM loaders.
  const specifier: string = "../mystery.mjs";
  const module: unknown = await import(specifier);
  const candidate = (module as { default?: unknown }).default;
  if (typeof candidate !== "function") {
    throw new Error("mystery.mjs does not default-export a function");
  }
  return candidate as Mystery;
}

interface Failure {
  readonly group: string;
  readonly input: string;
  readonly expected: string;
  readonly actual: string;
}

const failures: Failure[] = [];
let checked = 0;

function compare(mystery: Mystery, group: string, input: string): void {
  const expected = mystery(input);
  const actual = solution(input);
  checked += 1;
  if (actual !== expected) failures.push({ group, input, expected, actual });
}

function describe(input: string): string {
  const shown = input.length > 40 ? `${input.slice(0, 40)}…` : input;
  return `${JSON.stringify(shown)} (length ${input.length})`;
}

/* ------------------------------------------------------------- generators -- */

/** Deterministic PRNG (mulberry32) so a failure is always reproducible. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(random: () => number, maxCodePoint: number, maxLength: number): string {
  const length = Math.floor(random() * (maxLength + 1));
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const codePoint = Math.floor(random() * (maxCodePoint + 1));
    // Skip the surrogate range here; lone surrogates get their own group.
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) {
      out += String.fromCharCode(0xfffd);
    } else {
      out += String.fromCodePoint(codePoint);
    }
  }
  return out;
}

/* ------------------------------------------------------------------ cases -- */

/** CRC-32/ISO-HDLC check vectors, independent of either implementation. */
const KNOWN_VECTORS: ReadonlyArray<readonly [string, string]> = [
  ["", "00000000"],
  ["a", "e8b7be43"],
  ["abc", "352441c2"],
  ["message digest", "20159d7f"],
  ["123456789", "cbf43926"], // the canonical CRC "check" value
  ["abcdefghijklmnopqrstuvwxyz", "4c2750bd"],
  ["The quick brown fox jumps over the lazy dog", "414fa339"],
];

async function main(): Promise<void> {
  const mystery = await loadMystery();

  // 1. Known-answer tests: pins the variant (init, polynomial, xor-out, hex).
  for (const [input, expected] of KNOWN_VECTORS) {
    const actual = solution(input);
    checked += 1;
    if (actual !== expected) {
      failures.push({ group: "known CRC-32 vectors", input, expected, actual });
    }
    compare(mystery, "known vectors vs mystery", input);
  }

  // 2. Edge cases around the empty/short end and the padding path.
  for (const input of ["", " ", "\0", "\0\0\0", "0", "\n", "\r\n", "\t"]) {
    compare(mystery, "short + control characters", input);
  }

  // 3. Every single code unit from 0x00 to 0xFF, alone and doubled.
  for (let code = 0; code <= 0xff; code += 1) {
    const char = String.fromCharCode(code);
    compare(mystery, "single code units", char);
    compare(mystery, "doubled code units", char + char);
  }

  // 4. Multi-byte UTF-8: 2-, 3- and 4-byte sequences.
  for (const input of [
    "é",
    "naïve café",
    "Ω≈ç√∫˜µ≤≥÷",
    "日本語テキスト",
    "Здравствуй, мир",
    "🙂",
    "👩‍👩‍👧‍👦 family with ZWJ",
    "𝔘𝔫𝔦𝔠𝔬𝔡𝔢 astral plane",
    "\u{10FFFF}",
    "\uFEFFleading BOM",
  ]) {
    compare(mystery, "multi-byte UTF-8", input);
  }

  // 5. Lone surrogates: TextEncoder substitutes U+FFFD, so both sides must.
  for (const input of [
    "\uD83D", // high surrogate alone
    "\uDE00", // low surrogate alone
    "a\uD83Db", // high surrogate in the middle
    "\uDE00\uD83D", // reversed pair — still two replacements
    "🙂\uD83D", // valid pair followed by a stray
  ]) {
    compare(mystery, "lone surrogates", input);
  }

  // 6. Length boundaries around the hex-padding logic and long buffers.
  for (const length of [1, 2, 3, 4, 7, 8, 15, 16, 31, 63, 64, 255, 256, 1023, 4096]) {
    compare(mystery, "length sweep", "a".repeat(length));
    compare(mystery, "length sweep (varied)", Array.from({ length }, (_, i) => String.fromCharCode(32 + (i % 95))).join(""));
  }

  // 7. Inputs whose checksum is small, to exercise the zero-padding branch.
  // (Found by brute force below rather than asserted: any short prefix works.)
  for (let n = 0; n < 2000; n += 1) {
    const input = `pad-${n}`;
    const digest = solution(input);
    if (digest.startsWith("00")) compare(mystery, "leading-zero digests", input);
  }

  // 8. Randomised fuzzing over three alphabets.
  const random = makeRandom(0x5eed1234);
  for (let i = 0; i < 1500; i += 1) {
    compare(mystery, "fuzz: ascii", randomString(random, 0x7f, 64));
    compare(mystery, "fuzz: latin-1 + BMP", randomString(random, 0xffff, 48));
    compare(mystery, "fuzz: full unicode", randomString(random, 0x10ffff, 32));
  }

  /* ---------------------------------------------------------- reporting -- */

  const groups = new Set(failures.map((f) => f.group));
  if (failures.length === 0) {
    console.log(`PASS  ${checked} comparisons, 0 mismatches`);
    console.log("      solution() is behaviourally identical to mystery.mjs");
    return;
  }

  console.log(`FAIL  ${failures.length} mismatch(es) out of ${checked} comparisons`);
  for (const failure of failures.slice(0, 10)) {
    console.log(
      `  [${failure.group}] ${describe(failure.input)}\n` +
        `      expected ${failure.expected}, got ${failure.actual}`,
    );
  }
  throw new Error(`Not equivalent: ${failures.length} mismatches across ${groups.size} group(s)`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  throw error;
});
