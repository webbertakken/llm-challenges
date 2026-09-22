/**
 * CRC-32, ISO-HDLC / IEEE 802.3 (the ZIP, PNG, and Ethernet variant).
 *
 * Reflected polynomial 0xEDB88320, init 0xFFFFFFFF, xorout 0xFFFFFFFF.
 * The input string is hashed as UTF-8. The result is 8 lowercase hex digits.
 */

const REFLECTED_POLYNOMIAL = 0xedb88320;

function crc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let value = 0; value < 256; value += 1) {
    let crc = value;
    for (let bit = 0; bit < 8; bit += 1) {
      const lsb = (crc & 1) !== 0;
      crc >>>= 1;
      if (lsb) crc ^= REFLECTED_POLYNOMIAL;
    }
    table[value] = crc >>> 0;
  }
  return table;
}

const TABLE = crc32Table();

export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ (TABLE[(crc ^ byte) & 0xff] ?? 0);
  }
  crc = (crc ^ 0xffffffff) >>> 0;
  return crc.toString(16).padStart(8, "0");
}
