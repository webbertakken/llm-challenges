/**
 * CRC-32 (IEEE 802.3 / ISO 3309 / ITU-T V.42 / Ethernet / Gzip / PNG)
 *
 * Implements the standard 32-bit cyclic redundancy check over UTF-8 encoded text.
 */

// Standard reversed/reflected polynomial for CRC-32 (0xEDB88320)
const CRC32_POLYNOMIAL = 0xedb88320;

/**
 * Precomputes the 256-entry lookup table for fast byte-by-byte CRC-32 calculation.
 */
function makeCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc & 1) ? (CRC32_POLYNOMIAL ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc >>> 0;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();
const textEncoder = new TextEncoder();

/**
 * Computes the CRC-32 checksum of an input string and returns it
 * as an 8-character, lowercase, zero-padded hexadecimal string.
 *
 * @param input The UTF-8 string to hash.
 * @returns 8-character lowercase hex string (e.g. "cbf43926" for "123456789").
 */
export function solution(input: string): string {
  const bytes = textEncoder.encode(input);
  let crc = 0xffffffff;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    const tableIndex = (crc ^ byte) & 0xff;
    crc = (crc >>> 8) ^ CRC_TABLE[tableIndex]!;
  }

  // Final XOR inversion and cast to unsigned 32-bit integer
  const finalCrc = (crc ^ 0xffffffff) >>> 0;

  // Format as 8-character zero-padded lowercase hex string
  return finalCrc.toString(16).padStart(8, "0");
}
