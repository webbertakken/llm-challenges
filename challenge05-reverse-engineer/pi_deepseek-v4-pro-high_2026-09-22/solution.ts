/**
 * CRC-32 (IEEE 802.3) checksum, re-implemented clearly.
 *
 * The obfuscated `mystery.mjs` builds the classic reflected CRC-32 lookup
 * table (polynomial 0xEDB88320) and folds each UTF-8 byte of the input
 * through it, with the standard init value 0xFFFFFFFF and a final XOR with
 * 0xFFFFFFFF. The result is rendered as an 8-digit lowercase hexadecimal
 * string, zero-padded on the left.
 */

const POLYNOMIAL = 0xedb88320;

/** The 256-entry reflected CRC-32 lookup table. */
const TABLE: Uint32Array = buildTable();

function buildTable(): Uint32Array {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let crc = n;
    for (let bit = 0; bit < 8; bit++) {
      crc =
        (crc & 1) !== 0
          ? POLYNOMIAL ^ (crc >>> 1)
          : crc >>> 1;
    }
    table[n] = crc >>> 0;
  }
  return table;
}

/**
 * Compute the CRC-32 checksum of the UTF-8 encoding of `input` and return it
 * as an 8-character, zero-padded lowercase hexadecimal string.
 */
export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);

  let crc = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ TABLE[(crc ^ bytes[i]!) & 0xff]!;
  }

  const checksum = (crc ^ 0xffffffff) >>> 0;
  return checksum.toString(16).padStart(8, "0");
}
