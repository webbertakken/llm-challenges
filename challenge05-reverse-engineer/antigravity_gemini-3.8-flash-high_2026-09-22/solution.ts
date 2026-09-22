/**
 * CRC-32 (IEEE 802.3 / ISO 3309 standard) implementation.
 *
 * Parameters:
 * - Polynomial: 0x04C11DB7 (reversed / reflected: 0xEDB88320)
 * - Initial Remainder: 0xFFFFFFFF
 * - Input/Output Reflection: True (LSB-first)
 * - Final XOR: 0xFFFFFFFF
 * - Encoding: UTF-8
 * - Output Format: 8-character lowercase hex string with zero-padding
 */

const CRC32_POLYNOMIAL = 0xedb88320;

// Precompute 256-entry table for byte-by-byte CRC calculation
const CRC32_TABLE = new Uint32Array(256);
for (let byteVal = 0; byteVal < 256; byteVal++) {
  let entry = byteVal;
  for (let bit = 0; bit < 8; bit++) {
    entry = (entry & 1) ? (entry >>> 1) ^ CRC32_POLYNOMIAL : entry >>> 1;
  }
  CRC32_TABLE[byteVal] = entry >>> 0;
}

/**
 * Computes the CRC-32 checksum of an input string and returns it as an 8-character hex string.
 *
 * @param input Input string to hash
 * @returns 8-character zero-padded lowercase hexadecimal string
 */
export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let crc = 0xffffffff;

  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i]!;
    const tableIndex = (crc ^ byte) & 0xff;
    crc = (crc >>> 8) ^ CRC32_TABLE[tableIndex]!;
  }

  const finalCrc = (crc ^ 0xffffffff) >>> 0;
  return finalCrc.toString(16).padStart(8, '0');
}
