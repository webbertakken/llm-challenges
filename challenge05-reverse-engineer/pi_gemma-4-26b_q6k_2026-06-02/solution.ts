import { solution } from "./solution";
import mystery from "../mystery.mjs";

export function solution(input: string): string {
  // The mystery function is a CRC32 implementation.
  // Let's implement it clearly.

  // 1. CRC32 Table Generation
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    crcTable[i] = c >>> 0;
  }

  // 2. Input Encoding
  const bytes = new TextEncoder().encode(input);

  // 3. CRC32 Calculation
  let crc = 0xFFFFFFFF;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ byte) & 0xFF];
  }
  crc = (crc ^ 0xFFFFFFFF) >>> 0;

  // 4. Hex Formatting (8 characters, zero-padded)
  return crc.toString(16).padStart(8, "0");
}
