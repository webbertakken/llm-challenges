/**
 * CRC-32/ISO-HDLC (PKZIP, PNG, Ethernet, ITU-T V.42).
 *
 * width=32
 * poly=0x04C11DB7 (reflected as 0xEDB88320)
 * init=0xFFFFFFFF
 * refin=true  refout=true
 * xorout=0xFFFFFFFF
 *
 * Output: 8-digit lowercase hexadecimal, zero-padded.
 */

const POLY_REFLECTED = 0xedb88320;
const INIT = 0xffffffff;
const XOR_OUT = 0xffffffff;

function buildReflectedTable(): readonly number[] {
  const table: number[] = new Array(256);
  for (let byte = 0; byte < 256; byte++) {
    let crc = byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) === 1 ? POLY_REFLECTED ^ (crc >>> 1) : crc >>> 1;
    }
    table[byte] = crc >>> 0;
  }
  return table;
}

const TABLE = buildReflectedTable();

function crc32(bytes: Uint8Array): number {
  let crc = INIT;
  for (let i = 0; i < bytes.length; i++) {
    const index = (crc ^ bytes[i]!) & 0xff;
    crc = (crc >>> 8) ^ TABLE[index]!;
  }
  return (crc ^ XOR_OUT) >>> 0;
}

function toHex8(value: number): string {
  return value.toString(16).padStart(8, "0");
}

export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return toHex8(crc32(bytes));
}
