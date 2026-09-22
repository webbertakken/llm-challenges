/**
 * Equivalence test harness for Challenge 05
 */

import { solution } from "./solution.js";
// @ts-expect-error Untyped JavaScript module import
import mystery from "../mystery.mjs";

function assertEqual(actual: string, expected: string, testName: string) {
  if (actual !== expected) {
    throw new Error(`Test failed: ${testName}\nExpected: "${expected}"\nActual:   "${actual}"`);
  }
}

console.log("Running equivalence tests between solution.ts and mystery.mjs...");

// 1. Classic Test Vectors
const testVectors: [string, string][] = [
  ["", "00000000"],
  ["a", "e8b7be43"],
  ["abc", "352441c2"],
  ["message digest", "20159d7f"],
  ["123456789", "cbf43926"],
  ["The quick brown fox jumps over the lazy dog", "414fa339"],
];

for (const [input, expected] of testVectors) {
  const result = solution(input);
  const mysteryResult = mystery(input);
  assertEqual(result, expected, `Vector "${input}"`);
  assertEqual(result, mysteryResult, `Parity check for "${input}"`);
}

// 2. Unicode and Multi-byte Edge Cases
const unicodeCases = [
  "🔥 Unicode emoji test 🚀",
  "日本語テキスト",
  "Привет мир",
  "Café au lait \u0000 null byte \uFFFF",
  "𝄞 musical symbol",
  "A".repeat(10000),
];

for (const input of unicodeCases) {
  const solResult = solution(input);
  const mysResult = mystery(input);
  assertEqual(solResult, mysResult, `Unicode test: "${input.slice(0, 20)}..."`);
}

// 3. Random Generated Strings
function randomString(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=[]{}|;:,.<>?/ \t\n\r";
  let str = "";
  for (let i = 0; i < len; i++) {
    str += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return str;
}

for (let i = 0; i < 500; i++) {
  const len = Math.floor(Math.random() * 200);
  const randStr = randomString(len);
  const sol = solution(randStr);
  const mys = mystery(randStr);
  if (sol !== mys) {
    throw new Error(`Random test mismatch at iteration ${i} for input length ${len}: expected ${mys}, got ${sol}`);
  }
}

console.log("All equivalence tests passed successfully! (500+ random cases verified)");
