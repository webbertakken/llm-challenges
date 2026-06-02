import assert from 'assert';
import { exec } from 'child_process';
import { promisify } from 'util';
import mystery from '../mystery.mjs';
import { solution } from './solution.js';

const execPromise = promisify(exec);

// A simple random string generator for testing
function generateRandomString(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789`~!@#$%^&*()-_=+[{]}|;:,<.>/?';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

async function runTests() {
    console.log('Running equivalence tests...');

    const testCases: string[] = [
        "",
        "a",
        "abc",
        "hello world",
        "The quick brown fox jumps over the lazy dog",
        "1234567890",
        "🎉✅🚀", // Unicode test
        "你好,世界", // Unicode test
        "\x00\x01\x02\x03\x04\x05\x06\x07\x08\x09\x0a\x0b\x0c\x0d\x0e\x0f", // Control characters
        generateRandomString(128),
        generateRandomString(512),
        generateRandomString(1024),
    ];

    let passed = 0;
    let failed = 0;

    for (const input of testCases) {
        const mysteryResult = mystery(input);
        const solutionResult = solution(input);

        try {
            assert.strictEqual(solutionResult, mysteryResult, `Input: "${input}"`);
            passed++;
            console.log(`✅ PASS: Input: "${input.substring(0, 20)}..."`);
        } catch (error) {
            failed++;
            console.error(`❌ FAIL: Input: "${input.substring(0, 20)}..."`);
            console.error(`  - Expected (mystery): ${mysteryResult}`);
            console.error(`  - Got (solution):     ${solutionResult}`);
        }
    }

    console.log('--- Test Summary ---');
    console.log(`Total: ${testCases.length}, Passed: ${passed}, Failed: ${failed}`);

    if (failed > 0) {
        console.error('Equivalence test failed.');
        process.exit(1);
    } else {
        console.log('All equivalence tests passed successfully!');
        // As a final check, try to use the official grader script if it exists
        try {
            const { stdout } = await execPromise('npx tsx ../grader/grade.ts .');
            console.log("--- Grader Output ---");
            console.log(stdout);
            if (stdout.includes("Result: EQUIVALENT")) {
                 console.log("✅ Official grader confirmed equivalence.");
            } else {
                 console.warn("⚠️ Official grader reported a mismatch.");
            }
        } catch (e) {
            console.warn("Could not run official grader. This is expected if it's not present.");
        }
    }
}

runTests();
