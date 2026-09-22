import mystery from "../mystery.mjs";
import { solution } from "./solution.ts";

type MysteryFn = (input: string) => string;

const mysteryFn = mystery as MysteryFn;

function assertEqual(input: string, expected?: string): void {
  const got = solution(input);
  const ref = mysteryFn(input);
  if (got !== ref) {
    throw new Error(
      `mismatch for ${JSON.stringify(input)}: solution=${got} mystery=${ref}`,
    );
  }
  if (expected !== undefined && got !== expected) {
    throw new Error(
      `known-vector miss for ${JSON.stringify(input)}: got=${got} want=${expected}`,
    );
  }
  if (!/^[0-9a-f]{8}$/.test(got)) {
    throw new Error(`bad format for ${JSON.stringify(input)}: ${got}`);
  }
}

const fixed: Array<[string, string]> = [
  ["", "00000000"],
  ["123456789", "cbf43926"],
  ["a", "e8b7be43"],
  ["abc", "352441c2"],
  ["hello", "3610a686"],
  ["Hello", "f7d18982"],
  [" ", "e96ccf45"],
  ["\n", "32d70693"],
  ["\0", "d202ef8d"],
  ["\0abc", "eb2147cc"],
];

for (const [input, expected] of fixed) {
  assertEqual(input, expected);
}

const unicode = ["©", "日本語", "🚀", "ééé", "𝄞", "cafe\u0301", "CAFÉ"];
for (const input of unicode) {
  assertEqual(input);
}

const lengths = [0, 1, 2, 3, 7, 8, 15, 16, 31, 32, 255, 256, 1024, 4096];
for (const n of lengths) {
  assertEqual("A".repeat(n));
  assertEqual("\0".repeat(n));
}

const alphabet =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \t\n\r\0!@#$%^&*()[]{}<>/\\,.;:'\"`~";

function randomString(rng: () => number, len: number): string {
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(rng() * alphabet.length)]!;
  }
  return out;
}

function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = mulberry32(0xc0ffee);
for (let i = 0; i < 400; i++) {
  assertEqual(randomString(rng, Math.floor(rng() * 80)));
}

for (let code = 0; code < 256; code++) {
  assertEqual(String.fromCharCode(code));
}

const allBytes = String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i));
assertEqual(allBytes);

console.log("equivalence: all cases passed");
