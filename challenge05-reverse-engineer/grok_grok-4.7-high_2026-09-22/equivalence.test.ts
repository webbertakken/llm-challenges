import { solution } from "./solution.js";

declare const process: { exitCode: number };

async function loadMystery(): Promise<(input: string) => string> {
  const importer = new Function("specifier", "return import(specifier)");
  const loaded: Promise<{ default: (input: string) => string }> = importer.call(
    undefined,
    "../mystery.mjs",
  );
  return (await loaded).default;
}

const CHECK_VECTOR = "123456789";
const CHECK_CRC = "cbf43926";

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomString(rng: () => number, length: number): string {
  let out = "";
  for (let i = 0; i < length; i += 1) {
    const roll = rng();
    if (roll < 0.6) {
      out += String.fromCharCode(Math.floor(rng() * 128));
    } else if (roll < 0.85) {
      out += String.fromCharCode(0x00a0 + Math.floor(rng() * 0x0200));
    } else if (roll < 0.95) {
      out += String.fromCodePoint(0x1f300 + Math.floor(rng() * 80));
    } else {
      out += String.fromCharCode(0xd800 + Math.floor(rng() * 0x0800));
    }
  }
  return out;
}

async function main(): Promise<void> {
  const mystery = await loadMystery();
  const cases: string[] = [
    "",
    "a",
    "0",
    CHECK_VECTOR,
    "The quick brown fox jumps over the lazy dog",
    "é",
    "你",
    "😀",
    "a\u0000b",
    "café",
    "\n\r\t",
    "A".repeat(64),
    "x".repeat(10_000),
    String.fromCharCode(...Array.from({ length: 128 }, (_, i) => i)),
  ];

  const rng = mulberry32(0x05c5c032);
  for (let n = 0; n < 400; n += 1) {
    const length = Math.floor(rng() * rng() * 300);
    cases.push(randomString(rng, length));
  }

  let failed = 0;

  function expectEqual(input: string): void {
    const got = solution(input);
    const expected = mystery(input);
    if (got !== expected) {
      failed += 1;
      const preview = JSON.stringify(input).slice(0, 80);
      console.error(`mismatch ${preview}\n  solution ${got}\n  mystery  ${expected}`);
    }
    if (!/^[0-9a-f]{8}$/.test(got)) {
      failed += 1;
      console.error(`bad format ${got} for ${JSON.stringify(input).slice(0, 40)}`);
    }
  }

  for (const input of cases) expectEqual(input);

  if (solution(CHECK_VECTOR) !== CHECK_CRC) {
    failed += 1;
    console.error(`known vector failed: ${solution(CHECK_VECTOR)} !== ${CHECK_CRC}`);
  }

  if (failed !== 0) {
    throw new Error(`${failed} failure(s)`);
  }

  console.log(`equivalent on ${cases.length} inputs, including the CRC-32 check vector`);
}

main().then(
  () => undefined,
  (error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  },
);
