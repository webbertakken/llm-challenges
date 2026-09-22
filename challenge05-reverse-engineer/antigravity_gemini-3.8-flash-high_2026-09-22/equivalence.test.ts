import mystery from '../mystery.mjs';
import { solution } from './solution.js';

function assert(condition: boolean, msg: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

const testCases = [
  "",
  "a",
  "abc",
  "123456789",
  "The quick brown fox jumps over the lazy dog",
  "Hello, World!",
  "UTF-8 test: 🚀 🌟 ñoño 日本語 مرحبا",
  "\x00\x01\x02\xFF",
  "A".repeat(10000),
];

console.log("Running deterministic edge case test battery...");
for (const tc of testCases) {
  const expected = mystery(tc);
  const actual = solution(tc);
  assert(
    actual === expected,
    `Mismatch for input '${tc.slice(0, 20)}...': expected '${expected}', got '${actual}'`
  );
}

console.log("Running randomised fuzz testing (1000 iterations)...");
for (let i = 0; i < 1000; i++) {
  const len = Math.floor(Math.random() * 200);
  let str = "";
  for (let j = 0; j < len; j++) {
    // Generate across full UTF-16 code point range
    const code = Math.floor(Math.random() * 0xffff);
    str += String.fromCharCode(code);
  }
  const expected = mystery(str);
  const actual = solution(str);
  assert(actual === expected, `Fuzz mismatch at iteration ${i}: expected '${expected}', got '${actual}'`);
}

console.log("All equivalence tests passed successfully!");
