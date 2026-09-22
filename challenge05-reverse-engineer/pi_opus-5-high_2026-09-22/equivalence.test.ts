/**
 * Equivalence harness: `solution` vs the obfuscated `mystery.mjs`.
 *
 * Run with `npx tsx equivalence.test.ts`. Exits non-zero on any mismatch.
 */
import { solution } from "./solution.js";

type MysteryModule = { default: (input: string) => string };

// The obfuscated module ships no type declarations, so the specifier is built
// at runtime and the namespace is described locally.
const MYSTERY_SPECIFIER = ["..", "mystery.mjs"].join("/");

let checks = 0;
let failures = 0;

function compare(input: string, mystery: (value: string) => string, label: string): void {
  checks++;
  const expected = mystery(input);
  const actual = solution(input);
  if (expected !== actual) {
    failures++;
    console.error(`MISMATCH [${label}] input=${JSON.stringify(input)} mystery=${expected} solution=${actual}`);
  }
}

function assertEqual(actual: string, expected: string, label: string): void {
  checks++;
  if (actual !== expected) {
    failures++;
    console.error(`FAIL [${label}] expected=${expected} actual=${actual}`);
  }
}

/** Deterministic PRNG so a failing run is reproducible. */
function makeRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function randomString(random: () => number, maxLength: number, alphabet: string[]): string {
  const length = Math.floor(random() * maxLength);
  let out = "";
  for (let i = 0; i < length; i++) {
    out += alphabet[Math.floor(random() * alphabet.length)];
  }
  return out;
}

async function main(): Promise<void> {
  const loaded = (await import(MYSTERY_SPECIFIER)) as MysteryModule;
  const mystery = loaded.default;

  /* 1. Published CRC-32/ISO-HDLC check vectors — pins the variant, not just
        agreement with the obfuscated source. */
  assertEqual(solution(""), "00000000", "vector: empty");
  assertEqual(solution("a"), "e8b7be43", "vector: a");
  assertEqual(solution("123456789"), "cbf43926", "vector: check string");
  assertEqual(
    solution("The quick brown fox jumps over the lazy dog"),
    "414fa339",
    "vector: pangram",
  );

  /* 2. Edge cases. */
  const edgeCases: [string, string][] = [
    ["", "empty string"],
    [" ", "single space"],
    ["\0", "NUL byte"],
    ["\0\0\0\0", "run of NULs"],
    ["\n\r\t", "control characters"],
    ["a".repeat(1), "one char"],
    ["a".repeat(255), "255 chars"],
    ["a".repeat(4096), "4096 chars"],
    ["é", "latin-1 supplement (2-byte UTF-8)"],
    ["ü".repeat(200), "repeated 2-byte"],
    ["日本語テキスト", "CJK (3-byte UTF-8)"],
    ["🙂", "astral plane (4-byte UTF-8, surrogate pair)"],
    ["👨‍👩‍👧‍👦", "ZWJ emoji sequence"],
    ["\u{10FFFF}", "highest code point"],
    ["\uD800", "lone high surrogate (encoder substitutes U+FFFD)"],
    ["\uDFFF", "lone low surrogate"],
    ["a\uD800b", "lone surrogate between ASCII"],
    ["\uFEFF", "byte order mark"],
    ["\uFFFD", "replacement character"],
    ["mixed: ascii + é + 日 + 🙂", "mixed widths"],
    ["\u0000\u007F\u0080\u07FF\u0800\uFFFF", "UTF-8 boundary code points"],
  ];
  for (const [input, label] of edgeCases) compare(input, mystery, label);

  /* 3. Single code points across the whole BMP (sampled) plus every byte value. */
  for (let code = 0; code < 0x100; code++) compare(String.fromCharCode(code), mystery, `char U+${code.toString(16)}`);
  for (let code = 0; code < 0x10000; code += 97) {
    compare(String.fromCharCode(code), mystery, `bmp U+${code.toString(16)}`);
  }

  /* 4. Randomised inputs over several alphabets and lengths. */
  const random = makeRandom(0x5eed1234);
  const alphabets: [string[], string][] = [
    ["abcdefghijklmnopqrstuvwxyz0123456789 ".split(""), "ascii"],
    ["\0\u0001\u0002\u00ff\u0100\u1234\uffff".split(""), "wide BMP"],
    [["🙂", "é", "日", "a", "\n", "\uD800", "\uDC00"], "mixed incl. lone surrogates"],
  ];
  for (const [alphabet, label] of alphabets) {
    for (let i = 0; i < 400; i++) {
      compare(randomString(random, 64, alphabet), mystery, `random ${label} #${i}`);
    }
  }
  for (let i = 0; i < 40; i++) {
    compare(randomString(random, 5000, "ab\u00e9\u65e5".split("")), mystery, `random long #${i}`);
  }

  /* 5. Output format: always eight lowercase hex digits. */
  for (let i = 0; i < 200; i++) {
    const value = randomString(random, 32, "abcdefgh0123456789".split(""));
    const out = solution(value);
    checks++;
    if (!/^[0-9a-f]{8}$/.test(out)) {
      failures++;
      console.error(`FAIL [format] input=${JSON.stringify(value)} output=${out}`);
    }
  }

  console.log(`${checks - failures}/${checks} checks passed`);
  if (failures > 0) throw new Error(`${failures} mismatches between solution and mystery.mjs`);
  console.log("Result: EQUIVALENT");
}

void main();
