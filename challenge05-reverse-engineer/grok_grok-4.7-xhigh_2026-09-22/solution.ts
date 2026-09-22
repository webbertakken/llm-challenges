/**
 * CRC-32/ISO-HDLC (PKZIP, Ethernet, PNG).
 *
 * Reflected polynomial 0xEDB88320, init 0xFFFFFFFF, xorout 0xFFFFFFFF.
 * The input is hashed as UTF-8. The result is 8 lowercase hex digits.
 */

const REFLECTED_POLYNOMIAL = 0xedb88320;

function crc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < 256; byte += 1) {
    let crc = byte;
    for (let bit = 0; bit < 8; bit += 1) {
      const lsb = (crc & 1) !== 0;
      crc >>>= 1;
      if (lsb) crc ^= REFLECTED_POLYNOMIAL;
    }
    table[byte] = crc >>> 0;
  }
  return table;
}

const TABLE = crc32Table();

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** CRC-32 of the UTF-8 encoding of `input`, as 8 lowercase hex digits. */
export function solution(input: string): string {
  return crc32(new TextEncoder().encode(input)).toString(16).padStart(8, "0");
}
