/**
 * CRC-32 (IEEE 802.3 / "CRC-32/ISO-HDLC"), as used by zip, gzip and PNG.
 *
 * Parameters, matching `mystery.mjs` exactly:
 *   width      32 bits
 *   polynomial 0x04C11DB7, reflected to 0xEDB88320 (input and output reflected)
 *   init       0xFFFFFFFF
 *   xor-out    0xFFFFFFFF
 *   message    the UTF-8 bytes of the input string
 *   output     the checksum in lowercase hex, zero-padded to 8 characters
 */

/** The generator polynomial in its reflected (LSB-first) form. */
const REFLECTED_POLYNOMIAL = 0xedb88320;

/**
 * One table entry per possible byte: the remainder of that byte shifted
 * through the polynomial eight times. Precomputing it turns the bit-by-bit
 * division into one table lookup per input byte.
 */
const CRC_TABLE: Uint32Array = buildCrcTable();

function buildCrcTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < table.length; byte += 1) {
    let remainder = byte;
    for (let bit = 0; bit < 8; bit += 1) {
      // Reflected division: shift towards the LSB, subtract (xor) the
      // polynomial whenever the bit shifted out was set.
      remainder =
        (remainder & 1) === 1
          ? REFLECTED_POLYNOMIAL ^ (remainder >>> 1)
          : remainder >>> 1;
    }
    table[byte] = remainder >>> 0;
  }
  return table;
}

/** The CRC-32 checksum of `bytes`, as an unsigned 32-bit number. */
export function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ byte) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const UTF8 = new TextEncoder();

/**
 * The CRC-32 of `input`'s UTF-8 encoding, as 8 lowercase hex digits.
 *
 * Unpaired surrogates are encoded as U+FFFD, because that is what UTF-8
 * encoding does — the same behaviour as the original.
 */
export function solution(input: string): string {
  return crc32(UTF8.encode(input)).toString(16).padStart(8, "0");
}

export default solution;
