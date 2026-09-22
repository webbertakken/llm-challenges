import { solution } from "./solution.js";

// mystery.mjs is the obfuscated subject and ships with no types.
// @ts-expect-error untyped JavaScript module
import mystery from "../mystery.mjs";

function mysteryOf(input: string): string {
  return mystery(input);
}

function check(input: string): void {
  const expected = mysteryOf(input);
  const actual = solution(input);
  if (actual !== expected) {
    throw new Error(
      `mismatch for ${JSON.stringify(input)}: got ${actual}, mystery ${expected}`,
    );
  }
  if (!/^[0-9a-f]{8}$/.test(actual)) {
    throw new Error(`bad digest format ${actual}`);
  }
}

const fixed = [
  "",
  "a",
  "123456789",
  "The quick brown fox jumps over the lazy dog",
  "é",
  "ÿ",
  "你好",
  "😀",
  "a\0b",
  "\n",
  "\r\n\t",
  " ",
  "0",
  "FFFFFFFF",
  "🙂🙂",
  "ééé",
  String.fromCodePoint(0x7ff),
  String.fromCodePoint(0x800),
  String.fromCodePoint(0xffff),
  "\uD800",
  "\uDFFF",
  "a\uD800b",
];

for (let code = 0; code < 256; code += 1) {
  fixed.push(String.fromCharCode(code));
}

function makeRng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state);
    mixed = (mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)) ^ mixed;
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(rng: () => number, maxLength: number): string {
  const length = Math.floor(rng() * maxLength);
  let text = "";
  for (let i = 0; i < length; i += 1) {
    const roll = rng();
    if (roll < 0.6) {
      text += String.fromCharCode(Math.floor(rng() * 128));
    } else if (roll < 0.85) {
      text += String.fromCharCode(0x80 + Math.floor(rng() * 128));
    } else if (roll < 0.97) {
      const code = 0x100 + Math.floor(rng() * (0xd800 - 0x100));
      text += String.fromCharCode(code);
    } else {
      text += String.fromCodePoint(0x1f300 + Math.floor(rng() * 80));
    }
  }
  return text;
}

const rng = makeRng(0xc0ffee);
const randomCases: string[] = [];
for (let i = 0; i < 5000; i += 1) {
  randomCases.push(randomString(rng, i < 100 ? 4 : 64));
}

let checked = 0;
for (const input of [...fixed, ...randomCases]) {
  check(input);
  checked += 1;
}

if (solution("") !== "00000000") throw new Error("empty digest");
if (solution("123456789") !== "cbf43926") throw new Error("check value");

console.log(`equivalent on ${checked} inputs`);
