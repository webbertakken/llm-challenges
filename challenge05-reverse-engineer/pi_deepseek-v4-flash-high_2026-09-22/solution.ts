/**
 * CRC-32/ISO-HDLC — the ubiquitous "standard" CRC-32 used by zlib, gzip, PNG
 * and ZIP. The checksum is computed over the UTF-8 bytes of the input and
 * rendered as exactly eight lowercase hexadecimal digits.
 *
 * Parameters (Rocksoft model): width 32, polynomial 0x04C11DB7 (reflected as
 * 0xEDB88320), init 0xFFFFFFFF, refin/refout true, final XOR 0xFFFFFFFF.
 * Check value: CRC-32("123456789") = 0xCBF43926.
 */

/** The polynomial 0x04C11DB7 with its bits reversed, as used by a reflected CRC. */
const REFLECTED_POLYNOMIAL = 0xedb88320;

/** Pre-conditioning value: all bits set. */
const INITIAL_REMAINDER = 0xffffffff;

/** Post-conditioning XOR: inverts every bit of the final remainder. */
const FINAL_XOR = 0xffffffff;

/**
 * A 256-entry table mapping the low byte of the running remainder to the
 * remainder it becomes after eight reflected polynomial divisions. Building it
 * once turns the per-byte update into a single table lookup.
 */
const REMAINDER_TABLE: Uint32Array = buildRemainderTable();

function buildRemainderTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < table.length; byte++) {
    let remainder = byte;
    for (let bit = 0; bit < 8; bit++) {
      remainder =
        (remainder & 1) === 1
          ? REFLECTED_POLYNOMIAL ^ (remainder >>> 1)
          : remainder >>> 1;
    }
    table[byte] = remainder >>> 0;
  }
  return table;
}

/** Returns the 8-digit lowercase hexadecimal CRC-32/ISO-HDLC of `input`. */
export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);

  let remainder = INITIAL_REMAINDER;
  for (const byte of bytes) {
    remainder = (remainder >>> 8) ^ REMAINDER_TABLE[(remainder ^ byte) & 0xff];
  }

  const checksum = (remainder ^ FINAL_XOR) >>> 0;
  return checksum.toString(16).padStart(8, "0");
}
