/**
 * CRC-32 (IEEE 802.3 / "CRC-32/ISO-HDLC") over the UTF-8 encoding of a string,
 * rendered as lowercase hex, zero-padded to eight digits.
 *
 * Parameters: width 32, reflected polynomial 0xEDB88320 (the bit-reversal of
 * 0x04C11DB7), init 0xFFFFFFFF, input and output reflected, final XOR
 * 0xFFFFFFFF. See `analysis.md` for the derivation.
 */

/** Bit-reversed CRC-32 polynomial, used by the table-driven reflected form. */
const REFLECTED_POLYNOMIAL = 0xedb88320;

const CRC32_TABLE = buildCrc32Table();

/**
 * Byte-at-a-time lookup table: entry `n` is the CRC register after feeding the
 * byte `n` into a zeroed register, i.e. eight reflected polynomial divisions.
 */
function buildCrc32Table(): Uint32Array {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < 256; byte++) {
    let remainder = byte;
    for (let bit = 0; bit < 8; bit++) {
      remainder = remainder & 1 ? REFLECTED_POLYNOMIAL ^ (remainder >>> 1) : remainder >>> 1;
    }
    table[byte] = remainder >>> 0;
  }
  return table;
}

/** CRC-32 of a byte sequence, as an unsigned 32-bit number. */
export function crc32(bytes: Uint8Array): number {
  let register = 0xffffffff;
  for (const byte of bytes) {
    register = (register >>> 8) ^ CRC32_TABLE[(register ^ byte) & 0xff]!;
  }
  return (register ^ 0xffffffff) >>> 0;
}

/** The eight-digit lowercase hex CRC-32 of `input`, encoded as UTF-8. */
export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return crc32(bytes).toString(16).padStart(8, "0");
}

export default solution;
