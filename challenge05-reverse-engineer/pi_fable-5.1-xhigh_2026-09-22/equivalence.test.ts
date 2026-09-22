/**
 * Equivalence harness: `solution` versus the obfuscated `mystery.mjs`, over
 * known CRC-32 check values, hand-picked edge cases and randomised inputs.
 * Run with `npx tsx equivalence.test.ts`; exits non-zero on any mismatch.
 */
import { solution } from "./solution.js";

type StringFn = (input: string) => string;

/** The module is untyped JavaScript, so it is loaded through a computed specifier. */
async function loadMystery(): Promise<StringFn> {
  const specifier: string = "../mystery.mjs";
  const module = (await import(specifier)) as { default: StringFn };
  return module.default;
}

/** Node's zlib.crc32 (Node 22.2+) as an independent third opinion when present. */
async function loadZlibCrc(): Promise<((data: string) => number) | undefined> {
  const specifier: string = "node:zlib";
  const zlib = (await import(specifier)) as { crc32?: (data: string) => number };
  return zlib.crc32;
}

const KNOWN_VECTORS: ReadonlyArray<readonly [input: string, crc: string]> = [
  ["", "00000000"],
  ["a", "e8b7be43"],
  ["abc", "352441c2"],
  ["123456789", "cbf43926"],
  ["The quick brown fox jumps over the lazy dog", "414fa339"],
];

const EDGE_CASES: readonly string[] = [
  "",
  "\0",
  "\0\0\0\0",
  " ",
  "\n\r\t",
  "0",
  "a".repeat(1000),
  "\u00ff",
  "é",
  "ü",
  "日本語",
  "😀",
  "👨‍👩‍👧‍👦",
  "\u{10ffff}",
  "\ud800",
  "\udfff",
  "\ud83d\ude00",
  "\ude00\ud83d",
  "mixed ascii и юникод and 🚀",
  "\ufeffbom",
  "\uffff",
  "x".repeat(65536),
];

function randomCodeUnitString(random: () => number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(Math.floor(random() * 0x10000));
  }
  return out;
}

function randomCodePointString(random: () => number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += String.fromCodePoint(Math.floor(random() * 0x110000));
  }
  return out;
}

function randomAsciiString(random: () => number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(Math.floor(random() * 128));
  }
  return out;
}

/** Deterministic PRNG (mulberry32) so failures are reproducible. */
function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function describe(input: string): string {
  const preview = JSON.stringify(input.length > 40 ? `${input.slice(0, 40)}...` : input);
  return `${preview} (length ${input.length})`;
}

async function main(): Promise<void> {
  const mystery = await loadMystery();
  const zlibCrc = await loadZlibCrc();
  const failures: string[] = [];
  let checked = 0;

  const compare = (input: string): void => {
    checked++;
    const expected = mystery(input);
    const actual = solution(input);
    if (actual !== expected) {
      failures.push(`mystery=${expected} solution=${actual} for ${describe(input)}`);
    }
    if (zlibCrc) {
      const reference = zlibCrc(input).toString(16).padStart(8, "0");
      if (reference !== actual) {
        failures.push(`zlib=${reference} solution=${actual} for ${describe(input)}`);
      }
    }
  };

  for (const [input, crc] of KNOWN_VECTORS) {
    if (solution(input) !== crc) failures.push(`known vector ${describe(input)}: got ${solution(input)}, want ${crc}`);
    compare(input);
  }

  for (const input of EDGE_CASES) compare(input);

  const random = seeded(0xc0ffee);
  for (let round = 0; round < 2000; round++) {
    const length = Math.floor(random() * 64);
    compare(randomAsciiString(random, length));
    compare(randomCodeUnitString(random, length));
    compare(randomCodePointString(random, length));
  }
  for (let round = 0; round < 20; round++) {
    compare(randomCodePointString(random, 5000 + Math.floor(random() * 5000)));
  }

  console.log(`Checked ${checked} inputs${zlibCrc ? " (also cross-checked against node:zlib)" : ""}.`);
  if (failures.length > 0) {
    console.error(`${failures.length} mismatch(es):`);
    for (const failure of failures.slice(0, 20)) console.error(`  ${failure}`);
    throw new Error("solution is NOT equivalent to mystery.mjs");
  }
  console.log("Result: EQUIVALENT");
}

main().catch((error: unknown) => {
  console.error(error);
  throw error;
});
