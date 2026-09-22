/**
 * CRC-32 (the IEEE 802.3 / zlib / PNG / gzip checksum, a.k.a. CRC-32/ISO-HDLC) of a string's
 * UTF-8 bytes, returned as 8 lowercase hexadecimal digits.
 *
 * Parameters: width 32, polynomial 0x04C11DB7 processed bit-reflected (0xEDB88320),
 * initial register 0xFFFFFFFF, reflected input and output, final XOR 0xFFFFFFFF.
 * Check value: solution("123456789") === "cbf43926".
 */

const REFLECTED_POLYNOMIAL = 0xedb88320;
const INITIAL_REGISTER = 0xffffffff;
const FINAL_XOR = 0xffffffff;

/** Remainder of dividing a single byte value by the polynomial, LSB-first. */
function crcOfByte(byte: number): number {
  let remainder = byte;
  for (let bit = 0; bit < 8; bit++) {
    const lowBitSet = (remainder & 1) === 1;
    remainder >>>= 1;
    if (lowBitSet) remainder ^= REFLECTED_POLYNOMIAL;
  }
  return remainder >>> 0;
}

/** 256-entry lookup table so the main loop processes a whole byte per step. */
const CRC_TABLE: readonly number[] = Array.from({ length: 256 }, (_, byte) => crcOfByte(byte));

const utf8 = new TextEncoder();

export function crc32(bytes: Uint8Array): number {
  let register = INITIAL_REGISTER;
  for (const byte of bytes) {
    const tableIndex = (register ^ byte) & 0xff;
    register = (register >>> 8) ^ CRC_TABLE[tableIndex]!;
  }
  return (register ^ FINAL_XOR) >>> 0;
}

export function solution(input: string): string {
  // TextEncoder emits UTF-8; lone surrogates become U+FFFD (EF BF BD).
  return crc32(utf8.encode(input)).toString(16).padStart(8, "0");
}
