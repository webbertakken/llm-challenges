/**
 * CRC-32 (the ISO-HDLC / IEEE 802.3 variant used by zlib, gzip, PNG and ZIP) of
 * a string's UTF-8 encoding, formatted as 8 lowercase hexadecimal digits.
 *
 * Rocksoft model parameters:
 *   width 32, poly 0x04C11DB7 (0xEDB88320 bit-reversed), init 0xFFFFFFFF,
 *   refin true, refout true, xorout 0xFFFFFFFF, check("123456789") = 0xCBF43926.
 */

/** The generator polynomial 0x04C11DB7 with its bits reversed, for the LSB-first (reflected) algorithm. */
const REFLECTED_POLYNOMIAL = 0xedb88320;
const INITIAL_REGISTER = 0xffffffff;
const FINAL_XOR = 0xffffffff;

/**
 * Lookup table for byte-at-a-time CRC (Sarwate's algorithm): entry `n` is the
 * register contribution of shifting byte value `n` through eight rounds of
 * bitwise polynomial division.
 */
const BYTE_TABLE: Uint32Array = (() => {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < table.length; byte++) {
    let remainder = byte;
    for (let bit = 0; bit < 8; bit++) {
      const lowBitSet = (remainder & 1) === 1;
      remainder >>>= 1;
      if (lowBitSet) remainder ^= REFLECTED_POLYNOMIAL;
    }
    table[byte] = remainder;
  }
  return table;
})();

/** CRC-32 of raw bytes, as an unsigned 32-bit integer. */
export function crc32(bytes: Uint8Array): number {
  let register = INITIAL_REGISTER;
  for (const byte of bytes) {
    register = (register >>> 8) ^ BYTE_TABLE[(register ^ byte) & 0xff];
  }
  return (register ^ FINAL_XOR) >>> 0;
}

/** Formats a 32-bit checksum as exactly 8 lowercase hex digits. */
function toHex32(checksum: number): string {
  return checksum.toString(16).padStart(8, "0");
}

const utf8 = new TextEncoder();

/**
 * CRC-32 of the UTF-8 bytes of `input` as 8 lowercase hex digits,
 * e.g. `solution("123456789") === "cbf43926"`. Lone surrogates are encoded as
 * U+FFFD, exactly as `TextEncoder` does.
 */
export function solution(input: string): string {
  return toHex32(crc32(utf8.encode(input)));
}
