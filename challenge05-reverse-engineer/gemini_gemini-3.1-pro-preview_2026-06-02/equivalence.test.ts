import assert from "node:assert/strict";
import mystery from "../mystery.mjs";
import { solution } from "./solution.js";

// Test suite for behavioral equivalence
function runTests() {
    console.log("Running equivalence tests between solution and mystery.mjs...");

    const testCases: string[] = [
        "", // Empty input
        "a",
        "abc",
        "message digest",
        "abcdefghijklmnopqrstuvwxyz",
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
        "1234567890",
        // Non-ASCII and multi-byte characters
        "hello world",
        "你好，世界", // Chinese characters
        "🌟 emoji test 🚀", 
        "¡Hola! ¿Cómo estás?", // Extended ASCII
        "\x00\x01\x02\x03\x04\x05", // Control characters
        "\n\r\t\\", // Escape sequences
        "A".repeat(1000), // Large strings
    ];

    // Generate random strings to ensure thorough testing
    for (let i = 0; i < 100; i++) {
        let randomStr = "";
        const length = Math.floor(Math.random() * 100);
        for (let j = 0; j < length; j++) {
            randomStr += String.fromCharCode(Math.floor(Math.random() * 65535)); // Covers wide range of unicode
        }
        testCases.push(randomStr);
    }

    let mismatches = 0;

    for (const testCase of testCases) {
        const expected = mystery(testCase);
        const actual = solution(testCase);

        if (expected !== actual) {
            console.error(`Mismatch found!\nInput: ${JSON.stringify(testCase)}\nExpected (mystery): ${expected}\nActual (solution): ${actual}`);
            mismatches++;
        }
    }

    if (mismatches === 0) {
        console.log(`✅ All ${testCases.length} tests passed. The implementations are strictly equivalent.`);
        process.exit(0);
    } else {
        console.error(`❌ Found ${mismatches} mismatches.`);
        process.exit(1);
    }
}

runTests();
