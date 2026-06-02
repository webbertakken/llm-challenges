import assert from "node:assert/strict";
import mystery from "../mystery.mjs";
import { solution } from "./solution.ts";

const mysteryFunction: (input: string) => string = mystery;

function check(input: string): void {
  assert.equal(solution(input), mysteryFunction(input), describeInput(input));
}

function describeInput(input: string): string {
  const preview = JSON.stringify(input);
  return preview.length <= 120 ? preview : `${preview.slice(0, 117)}...`;
}

const edgeCases = [
  "",
  "a",
  "abc",
  "message digest",
  "abcdefghijklmnopqrstuvwxyz",
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
  "123456789",
  "hello\nworld",
  "\0",
  "\0\0\0\0",
  "line endings\r\n",
  " ",
  " ".repeat(1024),
  "é",
  "e\u0301",
  "こんにちは",
  "Привет",
  "مرحبا",
  "😀",
  "👩‍💻",
  "\ud800",
  "\udc00",
  "\ud83d",
  "\ude00",
  "abc\ud800def",
  "abc\udc00def",
];

for (const input of edgeCases) {
  check(input);
}

assert.equal(solution(""), "00000000");
assert.equal(solution("123456789"), "cbf43926");

let randomState = 0x12345678;

function nextRandomUint32(): number {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState;
}

function randomString(maxLength: number): string {
  const length = nextRandomUint32() % (maxLength + 1);
  let value = "";

  for (let index = 0; index < length; index += 1) {
    const mode = nextRandomUint32() % 6;

    if (mode === 0) {
      value += String.fromCharCode(nextRandomUint32() % 0x80);
    } else if (mode === 1) {
      value += String.fromCharCode(0x80 + (nextRandomUint32() % 0x780));
    } else if (mode === 2) {
      value += String.fromCharCode(0x800 + (nextRandomUint32() % 0x6800));
    } else if (mode === 3) {
      value += String.fromCharCode(0xd800 + (nextRandomUint32() % 0x800));
    } else {
      const codePoint = 0x10000 + (nextRandomUint32() % (0x10ffff - 0x10000 + 1));
      value += String.fromCodePoint(codePoint);
    }
  }

  return value;
}

for (let index = 0; index < 2_000; index += 1) {
  check(randomString(256));
}

console.log("All equivalence checks passed.");
