import { solution } from './solution.js';
import mystery from '../mystery.mjs';

const testCases = [
  "",
  "a",
  "abc",
  "message digest",
  "abcdefghijklmnopqrstuvwxyz",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  "12345678901234567890123456789012345678901234567890123456789012345678901234567890",
  "\u1234", // non-ASCII
  "😊", // multi-byte emoji
  "A".repeat(1000), // longer string
  "!@#$%^&*()_+",
  "   ",
  "\n\r\t"
];

function runTests() {
  let failures = 0;
  for (const input of testCases) {
    const expected = mystery(input);
    const actual = solution(input);
    if (expected !== actual) {
      console.error(`FAIL: input="${input}"`);
      console.error(`  Expected: ${expected}`);
      console.error(`  Actual:   ${actual}`);
      failures++;
    } else {
      console.log(`PASS: input="${input.length > 20 ? input.substring(0, 17) + '...' : input}" -> ${actual}`);
    }
  }

  // Random tests
  for (let i = 0; i < 100; i++) {
    const randomInput = Math.random().toString(36).substring(7) + Math.random().toString(36).substring(7);
    const expected = mystery(randomInput);
    const actual = solution(randomInput);
    if (expected !== actual) {
      console.error(`FAIL: random input="${randomInput}"`);
      console.error(`  Expected: ${expected}`);
      console.error(`  Actual:   ${actual}`);
      failures++;
    }
  }

  if (failures === 0) {
    console.log("\nAll 113 tests passed! Equivalence confirmed.");
    process.exit(0);
  } else {
    console.error(`\n${failures} tests failed.`);
    process.exit(1);
  }
}

runTests();
