import * as assert from "node:assert";
import mystery from "../mystery.mjs";
import { solution } from "./solution.js";

function runTests() {
  const edgeCases = [
    "",
    "a",
    "abc",
    "123456789",
    "hello world",
    " ",
    "\\0",
    "\\n\\r\\t",
    "🌟", // emoji
    "こんにちは", // multi-byte
    "A".repeat(10000), // large string
  ];

  for (const tc of edgeCases) {
    const expected = mystery(tc);
    const actual = solution(tc);
    assert.strictEqual(actual, expected, `Failed on edge case: "${tc}"`);
  }

  // Randomised tests
  for (let i = 0; i < 1000; i++) {
    const randomStr = Array.from({ length: Math.random() * 100 }, () => 
      String.fromCharCode(Math.floor(Math.random() * 65536))
    ).join("");
    
    const expected = mystery(randomStr);
    const actual = solution(randomStr);
    assert.strictEqual(actual, expected, `Failed on random string`);
  }

  console.log("Equivalence tests passed.");
}

runTests();
