/**
 * CRC-32 (ISO-HDLC) — the checksum used by zlib, gzip, PNG, Ethernet, etc.
 *
 * Rocksoft / CRC-catalogue parameters:
 *   width   = 32
 *   poly    = 0x04C11DB7  (applied in bit-reflected form as 0xEDB88320)
 *   init    = 0xFFFFFFFF
 *   refin   = true        (table-driven reflected algorithm)
 *   refout  = true
 *   xorout  = 0xFFFFFFFF
 *   check   = 0xCBF43926  (CRC of the ASCII string "123456789")
 *
 * The exported `solution` hashes the UTF-8 encoding of its input and returns
 * the checksum as a lowercase, zero-padded, 8-character hexadecimal string.
 */

/** Bit-reflected CRC-32 polynomial (reverse of 0x04C11DB7). */
const REFLECTED_POLYNOMIAL = 0xedb88320;

/** Value XORed into the register before and after processing the data. */
const INITIAL_XOR = 0xffffffff;

/**
 * Precompute the 256-entry CRC-32 lookup table. Entry `b` is the CRC of a
 * single byte `b`, found by feeding it through the polynomial eight times.
 */
function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < table.length; byte++) {
    let remainder = byte;
    for (let bit = 0; bit < 8; bit++) {
      remainder =
        remainder & 1
          ? REFLECTED_POLYNOMIAL ^ (remainder >>> 1)
          : remainder >>> 1;
    }
    table[byte] = remainder >>> 0;
  }
  return table;
}

const CRC32_TABLE = buildCrc32Table();

/** Compute the CRC-32 checksum of a byte sequence as an unsigned 32-bit value. */
function crc32(bytes: Uint8Array): number {
  let crc = INITIAL_XOR;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ INITIAL_XOR) >>> 0;
}

/**
 * Return the CRC-32/ISO-HDLC checksum of `input` (encoded as UTF-8) formatted
 * as a lowercase hexadecimal string, left-padded with zeros to eight digits.
 */
export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return crc32(bytes).toString(16).padStart(8, "0");
}
