/**
 * Equivalence harness: compares `solution` with the obfuscated `mystery.mjs`
 * over hand-picked edge cases, known CRC-32 check values and randomised strings.
 *
 *   npx tsx equivalence.test.ts
 */
// @ts-expect-error mystery.mjs is untyped JavaScript without a declaration file
import mysteryUntyped from "../mystery.mjs";
import { solution } from "./solution.js";

const mystery: (input: string) => string = mysteryUntyped;

function assertThat(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

let checked = 0;
const failures: string[] = [];

function compare(input: string): void {
  checked++;
  const expected = mystery(input);
  const actual = solution(input);
  if (expected !== actual) {
    failures.push(`${JSON.stringify(input)}: mystery=${expected} solution=${actual}`);
  }
}

// Known CRC-32/ISO-HDLC vectors (independent of mystery.mjs).
const knownVectors: ReadonlyArray<readonly [string, string]> = [
  ["", "00000000"],
  ["123456789", "cbf43926"],
  ["a", "e8b7be43"],
  ["abc", "352441c2"],
  ["The quick brown fox jumps over the lazy dog", "414fa339"],
];
for (const [input, crc] of knownVectors) {
  assertThat(solution(input) === crc, `known vector for ${JSON.stringify(input)}`);
  compare(input);
}

const edgeCases: readonly string[] = [
  "",
  " ",
  "\0",
  "\0\0\0\0",
  "\n",
  "\uffff",
  "é", // 2-byte UTF-8
  "€", // 3-byte UTF-8
  "😀", // 4-byte UTF-8 (surrogate pair)
  "\ud800", // lone high surrogate -> U+FFFD
  "\udc00", // lone low surrogate -> U+FFFD
  "a\ud800b",
  "日本語テキスト",
  "x".repeat(10_000),
  String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)),
];
edgeCases.forEach(compare);

// Values whose CRC has leading zero nibbles exercise the zero padding.
let paddingHits = 0;
for (let i = 0; i < 200_000 && paddingHits < 50; i++) {
  const input = `pad-${i}`;
  if (mystery(input).startsWith("0")) {
    paddingHits++;
    compare(input);
  }
}
assertThat(paddingHits > 0, "found inputs whose CRC starts with a zero nibble");

// Seeded PRNG (mulberry32) for reproducible random inputs.
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

const random = mulberry32(0xc0ffee);
const randomInt = (max: number): number => Math.floor(random() * max);

function randomString(): string {
  const length = randomInt(64);
  let out = "";
  for (let i = 0; i < length; i++) {
    const kind = randomInt(4);
    if (kind === 0) out += String.fromCharCode(32 + randomInt(95)); // printable ASCII
    else if (kind === 1) out += String.fromCharCode(randomInt(0x800)); // 1-2 byte UTF-8
    else if (kind === 2) out += String.fromCharCode(randomInt(0x10000)); // any UTF-16 unit, incl. lone surrogates
    else out += String.fromCodePoint(0x10000 + randomInt(0x100000)); // astral plane
  }
  return out;
}

for (let i = 0; i < 20_000; i++) compare(randomString());

if (failures.length > 0) {
  console.error(`FAIL: ${failures.length}/${checked} mismatches`);
  for (const failure of failures.slice(0, 20)) console.error(`  ${failure}`);
  throw new Error("solution is not equivalent to mystery.mjs");
}
console.log(`PASS: ${checked} inputs, solution matches mystery.mjs on all of them`);
