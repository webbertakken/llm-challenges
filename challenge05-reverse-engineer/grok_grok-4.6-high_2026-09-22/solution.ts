/**
 * CRC-32/ISO-HDLC (IEEE 802.3 / PKZIP / ITU-T V.42).
 *
 * Polynomial 0x04C11DB7 (reflected 0xEDB88320), init 0xFFFFFFFF,
 * reflected in and out, xorout 0xFFFFFFFF. Output is 8 lowercase hex digits.
 */

const POLYNOMIAL = 0xedb88320;
const INIT = 0xffffffff;
const XOR_OUT = 0xffffffff;

function makeReflectedTable(polynomial: number): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let value = i;
    for (let bit = 0; bit < 8; bit++) {
      value = (value & 1) === 1 ? (polynomial ^ (value >>> 1)) : value >>> 1;
    }
    table[i] = value >>> 0;
  }
  return table;
}

const TABLE = makeReflectedTable(POLYNOMIAL);
const encoder = new TextEncoder();

export function solution(input: string): string {
  const bytes = encoder.encode(input);
  let crc = INIT;
  for (const byte of bytes) {
    const index = (crc ^ byte) & 0xff;
    crc = (crc >>> 8) ^ TABLE[index]!;
  }
  crc = (crc ^ XOR_OUT) >>> 0;
  return crc.toString(16).padStart(8, "0");
}
