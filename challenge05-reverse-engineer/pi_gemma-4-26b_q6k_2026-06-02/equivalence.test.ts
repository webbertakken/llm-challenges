import mystery from "../mystery.mjs";
import { solution } from "./solution";

function testEquivalence() {
  const testCases = [
    "",
    "a",
    "abc",
    "hello world",
    "The quick brown fox jumps over the lazy dog",
    "!@#$%^&*()_+",
    "1234567890",
    "👋🌍",
    "こんにちは",
    "A very long string to test performance and potential buffer issues. ".repeat(10),
  ];

  for (const input of testCases) {
    const mysteryResult = mystery(input);
    const solutionResult = solution(input);
    if (mysteryResult !== solutionResult) {
      console.error(`Mismatch found!`);
      console.error(`Input: "${input}"`);
      console.error(`Mystery: ${mysteryResult}`);
      console.error(`Solution: ${solutionResult}`);
      process.exit(1);
    }
  }

  // Random testing
  for (let i = 0; i < 1000; i++) {
    const randomString = Math.random().toString(36).substring(2, 15);
    const mysteryResult = mystery(randomString);
    const solutionResult = solution(randomString);
    if (mysteryResult !== solutionResult) {
      console.error(`Mismatch found during random testing!`);
      console.error(`Input: "${randomString}"`);
      console.error(`Mystery: ${mysteryResult}`);
      console.error(`Solution: ${solutionResult}`);
      process.exit(1);
    }
  }

  console.log("All tests passed!");
}

testEquivalence();
