/**
 * Equivalence harness: `solution` versus the obfuscated `mystery.mjs`.
 *
 * Run from this folder with `npx tsx equivalence.test.ts` (optionally `SEED=123`).
 * Exits non-zero on the first mismatch.
 */
import { crc32, solution } from "./solution.js";

/** The two bits of the Node.js global this harness uses (no dependency on @types/node). */
declare const process: { env: Record<string, string | undefined>; exitCode?: number };

function check(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function checkEqual(actual: string, expected: string, message: string): void {
  check(actual === expected, `${message}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

type Mystery = (input: string | Uint8Array) => string;

/** Loads mystery.mjs at runtime; it ships without type declarations, so its shape is checked, not assumed. */
async function loadMystery(): Promise<Mystery> {
  const specifier: string = "../mystery.mjs";
  const loaded: unknown = await import(specifier);
  if (typeof loaded !== "object" || loaded === null || !("default" in loaded) || typeof loaded.default !== "function") {
    throw new Error("mystery.mjs does not default-export a function");
  }
  const mysteryFunction = loaded.default;
  return (input) => {
    const output: unknown = mysteryFunction(input);
    if (typeof output !== "string") throw new TypeError(`mystery returned ${typeof output}`);
    return output;
  };
}

// ---------------------------------------------------------------------------
// Test utilities
// ---------------------------------------------------------------------------

/** Small deterministic PRNG (mulberry32) so failures are reproducible from the printed seed. */
function createRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const describeInput = (input: string): string =>
  input.length > 40 ? `${JSON.stringify(input.slice(0, 40))}… (${input.length} code units)` : JSON.stringify(input);

const HEX32 = /^[0-9a-f]{8}$/;
const counts = new Map<string, number>();

function expectEquivalent(mystery: Mystery, input: string, group: string): string {
  const expected = mystery(input);
  const actual = solution(input);
  checkEqual(actual, expected, `[${group}] mismatch for ${describeInput(input)}`);
  check(HEX32.test(actual), `[${group}] malformed output for ${describeInput(input)}`);
  counts.set(group, (counts.get(group) ?? 0) + 1);
  return actual;
}

function expectBytesEquivalent(mystery: Mystery, bytes: Uint8Array, group: string): void {
  const expected = mystery(bytes);
  const actual = crc32(bytes).toString(16).padStart(8, "0");
  checkEqual(actual, expected, `[${group}] mismatch for bytes [${Array.from(bytes).join(", ")}]`);
  counts.set(group, (counts.get(group) ?? 0) + 1);
}

// Independent CRC machinery for the forging tests below (bitwise table, no shared code with solution.ts).
const POLYNOMIAL = 0xedb88320;
const TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ POLYNOMIAL : c >>> 1;
  return c >>> 0;
});
const INDEX_BY_TOP_BYTE = new Map(TABLE.map((value, index) => [value >>> 24, index]));

/**
 * CRC forging: the 4 bytes that move the register from `from` to `to`. It works because the top bytes of the
 * 256 table entries are all distinct, so the table index of every step can be recovered backwards.
 */
function forgeSuffix(from: number, to: number): number[] {
  const indices: number[] = [];
  let state = to >>> 0;
  for (let step = 0; step < 4; step++) {
    const index = INDEX_BY_TOP_BYTE.get(state >>> 24);
    if (index === undefined) throw new Error("table top bytes are not a permutation");
    indices.unshift(index);
    state = ((state ^ (TABLE[index] ?? 0)) << 8) >>> 0;
  }
  const suffix: number[] = [];
  let register = from >>> 0;
  for (const index of indices) {
    suffix.push((register ^ index) & 0xff);
    register = ((register >>> 8) ^ (TABLE[index] ?? 0)) >>> 0;
  }
  return suffix;
}

// ---------------------------------------------------------------------------
// The battery
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const mystery = await loadMystery();
  const seed = Number(process.env.SEED ?? 20260922);
  const random = createRandom(seed);
  const randomInt = (maxExclusive: number): number => Math.floor(random() * maxExclusive);
  const utf8 = new TextEncoder();

  // 1. Known answers: standard CRC-32 check values, so both sides are also right, not merely equal.
  const knownAnswers: [string, string][] = [
    ["", "00000000"],
    ["a", "e8b7be43"],
    ["abc", "352441c2"],
    ["123456789", "cbf43926"],
    ["The quick brown fox jumps over the lazy dog", "414fa339"],
  ];
  for (const [input, checksum] of knownAnswers) {
    checkEqual(expectEquivalent(mystery, input, "known answers"), checksum, `CRC-32 of ${JSON.stringify(input)}`);
  }

  // 2. Hand-picked edge cases: control characters, multi-byte UTF-8, astral planes, surrogates, long inputs.
  const edgeCases = [
    " ",
    "\0",
    "\0\0\0\0",
    "\n\r\t",
    "\x7f",
    "\x80",
    "ÿ",
    "é",
    "e\u0301",
    "€",
    "\uFEFF",
    "\uFFFD",
    "\uFFFF",
    "日本語のテキスト",
    "مرحبا بالعالم",
    "😀",
    "👩‍💻🏳️‍🌈",
    "\u{10000}",
    "\u{10FFFF}",
    "\uD800",
    "\uDBFF",
    "\uDC00",
    "\uDFFF",
    "a\uD83Dz",
    "\uDE00\uD83D",
    "😀\uD83D",
    "a".repeat(1_000_000),
    "ab😀€".repeat(50_000),
    "\0".repeat(4096),
  ];
  for (const input of edgeCases) expectEquivalent(mystery, input, "edge cases");

  // Lone surrogates are replaced by U+FFFD during UTF-8 encoding, so these inputs collide by design.
  checkEqual(solution("\uD800"), solution("\uFFFD"), "lone high surrogate encodes as U+FFFD");
  checkEqual(solution("\uDFFF"), solution("\uFFFD"), "lone low surrogate encodes as U+FFFD");

  // 3. Every single UTF-16 code unit (all of the BMP, including every lone surrogate).
  for (let unit = 0; unit <= 0xffff; unit++) expectEquivalent(mystery, String.fromCharCode(unit), "every code unit");

  // 4. Astral code points: plane boundaries plus a strided sweep.
  for (let codePoint = 0x10000; codePoint <= 0x10ffff; codePoint += 101) {
    expectEquivalent(mystery, String.fromCodePoint(codePoint), "astral code points");
  }
  for (const codePoint of [0x10000, 0x1ffff, 0x20000, 0xeffff, 0xf0000, 0x10fffe, 0x10ffff]) {
    expectEquivalent(mystery, String.fromCodePoint(codePoint), "astral code points");
  }

  // 5. Raw bytes: the checksum core without the text encoder (mystery also accepts byte arrays).
  for (let byte = 0; byte < 256; byte++) expectBytesEquivalent(mystery, Uint8Array.of(byte), "raw bytes");
  for (let n = 0; n < 5_000; n++) {
    const bytes = Uint8Array.from({ length: randomInt(300) }, () => randomInt(256));
    expectBytesEquivalent(mystery, bytes, "raw bytes");
  }

  // 6. Randomised strings drawn from several alphabets, short and long.
  const alphabets: (() => string)[] = [
    () => String.fromCharCode(0x20 + randomInt(0x5f)), // printable ASCII
    () => String.fromCharCode(randomInt(0x80)), // any ASCII, including control characters
    () => String.fromCharCode(0x80 + randomInt(0x780)), // two-byte UTF-8
    () => String.fromCharCode(0x800 + randomInt(0xd800 - 0x800)), // three-byte UTF-8
    () => String.fromCodePoint(0x10000 + randomInt(0x100000)), // four-byte UTF-8 (surrogate pairs)
    () => String.fromCharCode(0xd800 + randomInt(0x800)), // lone surrogates
  ];
  const randomString = (length: number): string => {
    let text = "";
    for (let k = 0; k < length; k++) text += alphabets[randomInt(alphabets.length)]?.() ?? "";
    return text;
  };
  for (let n = 0; n < 20_000; n++) expectEquivalent(mystery, randomString(randomInt(65)), "random strings");
  for (let n = 0; n < 200; n++) expectEquivalent(mystery, randomString(1_000 + randomInt(9_000)), "random long strings");

  // 7. Zero padding: search for checksums with many leading zeros...
  let leadingZeroHits = 0;
  for (let n = 0; n < 200_000 && leadingZeroHits < 20; n++) {
    const input = `pad-${n}-${randomInt(1e9)}`;
    if (crc32(utf8.encode(input)) < 0x00100000) {
      expectEquivalent(mystery, input, "leading zeros");
      leadingZeroHits++;
    }
  }
  check(leadingZeroHits > 0, "found no checksum with 3+ leading zero digits");

  // ...and forge ASCII strings whose checksum is exactly a chosen extreme value (all zeros, sign bit, all ones).
  const targets = [0x00000000, 0x00000001, 0x0000ffff, 0x0f0f0f0f, 0x7fffffff, 0x80000000, 0xffffffff];
  for (const target of targets) {
    let forged: string | undefined;
    for (let attempt = 0; attempt < 10_000 && forged === undefined; attempt++) {
      const prefix = `forge-${target}-${attempt}`;
      const suffix = forgeSuffix(crc32(utf8.encode(prefix)) ^ 0xffffffff, target ^ 0xffffffff);
      if (suffix.every((byte) => byte < 0x80)) forged = prefix + String.fromCharCode(...suffix);
    }
    check(forged !== undefined, `could not forge an ASCII input for ${target.toString(16)}`);
    const checksum = expectEquivalent(mystery, forged, "forged extremes");
    checkEqual(checksum, target.toString(16).padStart(8, "0"), "forged checksum");
  }

  const total = [...counts.values()].reduce((sum, n) => sum + n, 0);
  for (const [group, n] of counts) console.log(`  ${group.padEnd(22)} ${String(n).padStart(7)} equivalent`);
  console.log(`EQUIVALENT: ${total} inputs, 0 mismatches (seed ${seed})`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
