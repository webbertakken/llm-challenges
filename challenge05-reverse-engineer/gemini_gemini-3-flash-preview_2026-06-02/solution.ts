/**
 * CRC-32 (IEEE 802.3) implementation.
 * This function computes the 32-bit Cyclic Redundancy Check of a string
 * and returns it as an 8-character zero-padded lowercase hexadecimal string.
 */

const CRC32_POLYNOMIAL = 0xEDB88320;

/**
 * Precomputes the CRC-32 lookup table for faster calculation.
 */
function makeTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (CRC32_POLYNOMIAL ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  return table;
}

const crcTable = makeTable();

/**
 * Computes the CRC-32 checksum of the given input string.
 * @param input The input string.
 * @returns An 8-character hex string representing the CRC-32 value.
 */
export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ bytes[i]) & 0xFF];
  }

  // Finalize: XOR with 0xFFFFFFFF and ensure it's a 32-bit unsigned integer
  const finalCrc = (crc ^ 0xFFFFFFFF) >>> 0;

  // Convert to hex and pad to 8 characters
  return finalCrc.toString(16).padStart(8, '0');
}
