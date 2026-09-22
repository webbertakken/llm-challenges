import mystery from "../mystery.mjs";
import { solution } from "./solution.ts";

type MysteryFn = (input: string) => string;

const mysteryFn = mystery as MysteryFn;

function assertEqual(input: string): void {
  const expected = mysteryFn(input);
  const actual = solution(input);
  if (actual !== expected) {
    throw new Error(
      `Mismatch for ${JSON.stringify(input)}: solution=${actual} mystery=${expected}`,
    );
  }
}

const fixedCases = [
  "",
  "123456789",
  "a",
  "A",
  "abc",
  "hello",
  "hello world",
  "The quick brown fox jumps over the lazy dog",
  "\0",
  "\0\0\0",
  " ",
  "  ",
  "\n",
  "\r\n",
  "é",
  "éé",
  "naïve",
  "日本語",
  "😀",
  "😀😃",
  "a".repeat(1024),
  "\u0000\u0001\u007f\u0080\u07ff\u0800\uffff",
  "0123456789abcdef",
  "CRC-32",
  JSON.stringify({ x: 1, y: [true, false] }),
];

for (const input of fixedCases) {
  assertEqual(input);
}

const alphabet =
  "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 \t\n\r_-./\\é😀";

function randomString(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)]!;
  }
  return out;
}

for (let n = 0; n < 400; n++) {
  assertEqual(randomString(n % 97));
}

for (let code = 0; code < 256; code++) {
  assertEqual(String.fromCharCode(code));
}

console.log(
  `EQUIVALENT — ${fixedCases.length} fixed cases, 400 random strings, 256 single-byte chars`,
);
