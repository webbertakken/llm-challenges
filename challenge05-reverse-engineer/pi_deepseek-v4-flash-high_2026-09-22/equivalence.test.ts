/// <reference path="./mystery-module.d.ts" />
import { solution } from "./solution.js";
import mystery from "../mystery.mjs";

/**
 * Equivalence harness: compares `solution` with the obfuscated `mystery.mjs`
 * over hand-picked edge cases, independently-known CRC-32 check values, and
 * deterministic pseudo-random inputs (ASCII, multi-byte UTF-8, lone
 * surrogates, full code points and very long strings).
 */

let checks = 0;
let failures = 0;

const HEX_32_BITS = /^[0-9a-f]{8}$/;

function preview(input: string): string {
  const shown = input.length > 40 ? `${input.slice(0, 40)}...(len ${input.length})` : input;
  return JSON.stringify(shown);
}

function compare(input: string): void {
  checks += 1;
  const actual = solution(input);
  const expected = mystery(input);
  if (actual !== expected) {
    failures += 1;
    console.error(`MISMATCH ${preview(input)}\n  solution: ${actual}\n  mystery:  ${expected}`);
  }
  if (!HEX_32_BITS.test(actual)) {
    failures += 1;
    console.error(`FORMAT ${preview(input)}\n  expected 8 lowercase hex digits, got: ${actual}`);
  }
}

function expectHex(input: string, expected: string): void {
  checks += 1;
  const actual = solution(input);
  if (actual !== expected) {
    failures += 1;
    console.error(`GOLDEN ${preview(input)}\n  expected: ${expected}\n  actual:   ${actual}`);
  }
}

/* ------------------------------------------------------------------ *
 * 1. Independently-known CRC-32/ISO-HDLC check values                 *
 * ------------------------------------------------------------------ */

expectHex("", "00000000");
expectHex("a", "e8b7be43");
expectHex("abc", "352441c2");
expectHex("123456789", "cbf43926"); // the canonical check value
expectHex("The quick brown fox jumps over the lazy dog", "414fa339");

/* ------------------------------------------------------------------ *
 * 2. Edge cases                                                       *
 * ------------------------------------------------------------------ */

const EDGE_CASES: readonly string[] = [
  "",
  " ",
  "\u0000",
  "\u0000".repeat(32),
  "\u0001\u0002\u0003",
  "\n\r\t",
  "\u007f\u0080\u00ff",
  "\ufeffBOM-prefixed",
  "a",
  "a".repeat(1000),
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
  String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)),
  "\u00e9", // é (2 UTF-8 bytes)
  "\u65e5\u672c\u8a9e", // 日本語 (3 UTF-8 bytes each)
  "\u{1f600}", // 😀 (4 UTF-8 bytes)
  "\u{10ffff}", // highest code point
  "\ud83d\ude00", // valid surrogate pair (same as 😀)
  "\ud800", // lone high surrogate -> U+FFFD in UTF-8
  "\udfff", // lone low surrogate -> U+FFFD in UTF-8
  "\ud800\ud800",
  "mixed \u00e9 \u65e5 \u{1f600} text",
];

for (const input of EDGE_CASES) {
  compare(input);
}

/* ------------------------------------------------------------------ *
 * 3. Deterministic pseudo-random inputs                               *
 * ------------------------------------------------------------------ */

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

const ALPHABETS: readonly (readonly string[])[] = [
  "abcdefghijklmnopqrstuvwxyz".split(""),
  "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(""),
  " !\"#$%&'()*+,-./:;<=>?@[\\]^_`{|}~".split(""),
  "éàüñçßøåæ".split(""),
  "日本語漢字テスト".split(""),
  Array.from("😀🚀🌟🎉🔥"),
];

function randomFromAlphabet(random: () => number, alphabet: readonly string[]): string {
  const length = Math.floor(random() * 41);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(random() * alphabet.length)];
  }
  return out;
}

function randomCodeUnits(random: () => number, maxLength: number): string {
  const length = Math.floor(random() * (maxLength + 1));
  let out = "";
  for (let i = 0; i < length; i++) {
    out += String.fromCharCode(Math.floor(random() * 0x10000));
  }
  return out;
}

function randomCodePoints(random: () => number, maxLength: number): string {
  const length = Math.floor(random() * (maxLength + 1));
  let out = "";
  for (let i = 0; i < length; i++) {
    const codePoint = Math.floor(random() * 0x110000);
    const valid = codePoint >= 0xd800 && codePoint <= 0xdfff ? 0xfffd : codePoint;
    out += String.fromCodePoint(valid);
  }
  return out;
}

const random = mulberry32(0x5eed_cafe);

for (let i = 0; i < 3000; i++) {
  const alphabet = ALPHABETS[i % ALPHABETS.length];
  compare(randomFromAlphabet(random, alphabet));
}

for (let i = 0; i < 1000; i++) {
  compare(randomCodeUnits(random, 48));
}

for (let i = 0; i < 1000; i++) {
  compare(randomCodePoints(random, 48));
}

// A few long inputs, where a byte-oriented slip would show up fast.
for (let i = 0; i < 5; i++) {
  const length = 50_000 + Math.floor(random() * 150_000);
  let out = "";
  for (let j = 0; j < length; j++) {
    out += ALPHABETS[0][Math.floor(random() * 26)];
  }
  compare(out);
}

/* ------------------------------------------------------------------ *
 * Summary                                                             *
 * ------------------------------------------------------------------ */

console.log(`equivalence: ${checks - failures}/${checks} checks matched`);
if (failures > 0) {
  throw new Error(`${failures} equivalence failure(s)`);
}
console.log("Result: EQUIVALENT");
