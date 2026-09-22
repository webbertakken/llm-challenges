/**
 * Equivalence harness: `solution` (clean reimplementation) vs `mystery.mjs`
 * (obfuscated source) over edge cases and deterministic randomised inputs.
 *
 * Run with: npx tsx equivalence.test.ts
 */
import mysteryDefault from "../mystery.mjs";
import { solution } from "./solution.js";

const mystery = mysteryDefault as (input: string) => string;

/** Deterministic PRNG so the randomised battery is reproducible. */
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

const alphabet = [
  ..."abcdefghijklmnopqrstuvwxyz",
  ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
  ..."0123456789",
  ..." !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~\n\t",
  "é",
  "€",
  "日本語",
  "🚀",
  "λ",
];

function randomString(rand: () => number, maxLen: number): string {
  const len = Math.floor(rand() * maxLen);
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(rand() * alphabet.length)];
  }
  return out;
}

let checked = 0;
function check(input: string): void {
  const expected = mystery(input);
  const actual = solution(input);
  if (expected !== actual) {
    throw new Error(
      `MISMATCH for ${JSON.stringify(input)}: expected ${expected}, got ${actual}`,
    );
  }
  checked++;
}

// --- Edge cases -------------------------------------------------------------
check("");
check("a");
check("A");
check("0");
check("\x00");
check("123456789"); // classic CRC-32 check value
check("The quick brown fox jumps over the lazy dog");
check("hello world");
check("a".repeat(1));
check("a".repeat(255));
check("a".repeat(256));
check("a".repeat(1024));
check("héllo wörld — ünïcödé");
check("日本語のテキスト");
check("🚀🪐🌍 emoji plane");
check("\\x00\\x01\\x7f\\x80\\xff");

// --- Deterministic randomised battery --------------------------------------
const rand = mulberry32(0xcafebabe);
for (let i = 0; i < 2000; i++) {
  check(randomString(rand, 64));
}
for (let i = 0; i < 200; i++) {
  check(randomString(rand, 2000));
}

console.log(`OK: ${checked} inputs matched (CRC-32 equivalent)`);
