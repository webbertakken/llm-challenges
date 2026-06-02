import { solution } from "./solution.js";
import mystery from "../mystery.mjs";

type TestCase = {
  input: string;
  expected?: string;
};

const testCases: TestCase[] = [
  // Empty input
  { input: "" },
  
  // Single characters
  { input: "a" },
  { input: "b" },
  { input: "A" },
  { input: "0" },
  
  // Common words
  { input: "hello" },
  { input: "world" },
  { input: "test" },
  { input: "The quick brown fox" },
  
  // With spaces and special characters
  { input: "hello world!" },
  { input: "test@123" },
  
  // Multi-byte UTF-8 characters
  { input: "café" },
  { input: "日本語" },
  { input: "emoji 🎉" },
  { input: "Hello 世界" },
  
  // Numbers
  { input: "12345" },
  { input: "0000" },
  { input: "9999" },
  
  // Repeated characters
  { input: "aaaaa" },
  { input: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" },
];

function runTests(): void {
  console.log("Running equivalence tests...\n");

  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    const mysteryResult = mystery(tc.input);
    const solutionResult = solution(tc.input);

    const match = mysteryResult === solutionResult;
    if (match) {
      passed++;
      console.log(`✓ "${tc.input}" -> "${solutionResult}"`);
    } else {
      failed++;
      console.log(`✗ "${tc.input}"`);
      console.log(`  mystery: "${mysteryResult}"`);
      console.log(`  solution: "${solutionResult}"`);
    }
  }

  console.log(`\n${passed} passed, ${failed} failed`);

  if (failed > 0) {
    throw new Error(`${failed} test(s) failed`);
  }
}

// Additional randomised tests
function runRandomizedTests(seed: number): void {
  const random = (s: number) => {
    const x = Math.sin(s++) * 10000;
    return x - Math.floor(x);
  };

  console.log("\nRunning randomized tests...");

  for (let i = 0; i < 100; i++) {
    const length = Math.floor(random(seed + i) * 200);
    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?";
    let input = "";
    for (let j = 0; j < length; j++) {
      input += chars[Math.floor(random(seed + i + j) * chars.length)];
    }

    const mysteryResult = mystery(input);
    const solutionResult = solution(input);

    if (mysteryResult !== solutionResult) {
      console.log(`✗ Random test ${i} failed for length ${length}`);
      console.log(`  mystery: "${mysteryResult}"`);
      console.log(`  solution: "${solutionResult}"`);
      throw new Error("Randomized test failed");
    }
  }

  console.log("✓ Randomized tests passed");
}

// Run all tests
runTests();
runRandomizedTests(42);

console.log("\nAll tests passed! Result: EQUIVALENT");
