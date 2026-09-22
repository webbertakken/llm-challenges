/**
 * CRC-32 (IEEE 802.3 / ISO-HDLC, as used by zlib, gzip, PNG and Ethernet) of the
 * UTF-8 encoding of `input`, formatted as 8 lowercase hexadecimal digits.
 *
 * Parameters: width 32, reflected polynomial 0xEDB88320 (normal form 0x04C11DB7),
 * initial value 0xFFFFFFFF, reflected input and output, final XOR 0xFFFFFFFF.
 * Check value: crc32("123456789") === "cbf43926".
 */

const REFLECTED_POLYNOMIAL = 0xedb88320;

/** Lookup table: CRC contribution of each possible byte value, one bit per iteration. */
const CRC_TABLE: readonly number[] = Array.from({ length: 256 }, (_, byte) => {
  let crc = byte;
  for (let bit = 0; bit < 8; bit++) {
    crc = crc & 1 ? (crc >>> 1) ^ REFLECTED_POLYNOMIAL : crc >>> 1;
  }
  return crc >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff]!;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const utf8 = new TextEncoder();

export function solution(input: string): string {
  return crc32(utf8.encode(input)).toString(16).padStart(8, "0");
}
