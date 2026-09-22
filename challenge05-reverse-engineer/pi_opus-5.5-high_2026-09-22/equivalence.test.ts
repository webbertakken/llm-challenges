/**
 * Equivalence harness: `solution` (clean CRC-32) vs `mystery.mjs` (obfuscated original).
 * Run: npx tsx equivalence.test.ts
 */
import { crc32, solution } from "./solution.js";

type StringFunction = (input: string) => string;

function hasDefaultStringFunction(module: unknown): module is { default: StringFunction } {
  return typeof module === "object" && module !== null && "default" in module && typeof module.default === "function";
}

async function loadMystery(): Promise<StringFunction> {
  // A non-literal specifier keeps the untyped .mjs module out of type-checking; it is narrowed below.
  const specifier: string = "../mystery.mjs";
  const module: unknown = await import(specifier);
  if (!hasDefaultStringFunction(module)) throw new Error("mystery.mjs has no default export function");
  return module.default;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG (mulberry32) so failures are reproducible from the seed
// ---------------------------------------------------------------------------

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type Random = () => number;

const randomInt = (random: Random, maxExclusive: number): number => Math.floor(random() * maxExclusive);

/** Random code units across every interesting range, including lone surrogates. */
function randomString(random: Random, maxLength: number): string {
  const generators: ((r: Random) => string)[] = [
    (r) => String.fromCharCode(randomInt(r, 0x80)), // ASCII incl. control chars and NUL
    (r) => String.fromCharCode(0x80 + randomInt(r, 0x780)), // 2-byte UTF-8
    (r) => String.fromCharCode(0x800 + randomInt(r, 0xd000 - 0x800)), // 3-byte UTF-8
    (r) => String.fromCodePoint(0x10000 + randomInt(r, 0x100000)), // 4-byte UTF-8 (surrogate pair)
    (r) => String.fromCharCode(0xd800 + randomInt(r, 0x800)), // lone surrogate
    (r) => String.fromCharCode(0xe000 + randomInt(r, 0x2000)), // BMP after surrogates
  ];
  const length = randomInt(random, maxLength + 1);
  let out = "";
  for (let i = 0; i < length; i++) out += generators[randomInt(random, generators.length)]!(random);
  return out;
}

// ---------------------------------------------------------------------------
// Independent bit-at-a-time reference (no lookup table) to cross-check the algorithm itself
// ---------------------------------------------------------------------------

function bitwiseCrc32(input: string): string {
  let crc = 0xffffffff;
  for (const byte of new TextEncoder().encode(input)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
  }
  return ((crc ^ 0xffffffff) >>> 0).toString(16).padStart(8, "0");
}

// ---------------------------------------------------------------------------
// Harness
// ---------------------------------------------------------------------------

let checks = 0;
const failures: string[] = [];

function expectSame(label: string, input: string, mystery: StringFunction): void {
  checks++;
  const expected = mystery(input);
  const actual = solution(input);
  if (expected !== actual) failures.push(`${label}: input=${JSON.stringify(input)} mystery=${expected} solution=${actual}`);
}

function expectEqual(label: string, actual: string, expected: string): void {
  checks++;
  if (actual !== expected) failures.push(`${label}: expected ${expected}, got ${actual}`);
}

async function main(): Promise<void> {
  const mystery = await loadMystery();

  // 1. Published CRC-32 test vectors pin down the exact variant.
  const vectors: [string, string][] = [
    ["", "00000000"],
    ["a", "e8b7be43"],
    ["abc", "352441c2"],
    ["123456789", "cbf43926"],
    ["The quick brown fox jumps over the lazy dog", "414fa339"],
  ];
  for (const [input, crc] of vectors) {
    expectEqual(`vector solution(${JSON.stringify(input)})`, solution(input), crc);
    expectEqual(`vector mystery(${JSON.stringify(input)})`, mystery(input), crc);
  }

  // 2. Hand-picked edge cases.
  const edgeCases = [
    "",
    " ",
    "\0",
    "\0\0\0\0",
    "\n",
    "\r\n",
    "\u007f",
    "\u0080",
    "\u00ff",
    "é",
    "e\u0301", // combining sequence: different bytes from precomposed é
    "€",
    "\uffff",
    "\ufeff",
    "😀",
    "👩‍👩‍👧‍👦",
    "\ud800", // lone high surrogate -> U+FFFD
    "\udfff", // lone low surrogate -> U+FFFD
    "\udfff\ud800", // reversed pair
    "\ufffd", // must equal the lone-surrogate result
    "日本語テキスト",
    "a".repeat(1_000),
    "\u00ff".repeat(4_096),
    "x".repeat(100_000),
  ];
  for (const input of edgeCases) expectSame("edge", input, mystery);

  // 3. Every single code unit (0x0000..0xFFFF) as a one-character string.
  for (let unit = 0; unit <= 0xffff; unit++) expectSame("code unit", String.fromCharCode(unit), mystery);

  // 4. Every single byte value inside a longer context.
  for (let byte = 0; byte < 0x80; byte++) expectSame("context", `prefix${String.fromCharCode(byte)}suffix`, mystery);

  // 5. Randomised inputs from a fixed seed.
  const random = mulberry32(0xc0ffee);
  for (let i = 0; i < 20_000; i++) expectSame(`random #${i}`, randomString(random, 64), mystery);
  for (let i = 0; i < 200; i++) expectSame(`random long #${i}`, randomString(random, 5_000), mystery);

  // 6. Outputs needing zero padding (leading hex zeros) are formatted identically.
  let padded = 0;
  for (let i = 0; padded < 50 && i < 1_000_000; i++) {
    const input = `pad-${i}`;
    if (solution(input).startsWith("0")) {
      padded++;
      expectSame("zero padding", input, mystery);
    }
  }
  expectEqual("found zero-padded outputs", String(padded), "50");

  // 7. The table-driven solution agrees with a from-scratch bitwise CRC-32.
  const crossRandom = mulberry32(42);
  for (let i = 0; i < 2_000; i++) {
    const input = randomString(crossRandom, 32);
    expectEqual(`bitwise ${JSON.stringify(input)}`, solution(input), bitwiseCrc32(input));
  }

  // 8. Output format invariants and numeric API.
  for (const input of ["", "abc", "😀"]) {
    const out = solution(input);
    checks++;
    if (!/^[0-9a-f]{8}$/.test(out)) failures.push(`format: ${JSON.stringify(input)} -> ${out}`);
  }
  expectEqual("crc32 bytes", crc32(new TextEncoder().encode("123456789")).toString(16), "cbf43926");

  if (failures.length > 0) {
    const shown = failures.slice(0, 20).map((failure) => `  ${failure}`);
    // Throwing rejects main(); the unhandled rejection makes the process exit non-zero.
    throw new Error([`FAIL: ${failures.length} of ${checks} checks failed`, ...shown].join("\n"));
  }
  console.log(`PASS: ${checks} checks, solution is equivalent to mystery.mjs`);
}

void main();
