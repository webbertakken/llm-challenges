/**
 * CRC-32 (IEEE 802.3, the "zip"/"PNG"/"Ethernet" checksum) of the UTF-8
 * encoding of `input`, rendered as 8 lowercase hexadecimal digits.
 *
 * Parameters of this variant (Rocksoft model): width 32, polynomial
 * 0x04C11DB7 (reflected form 0xEDB88320), init 0xFFFFFFFF, reflected input and
 * output, final XOR 0xFFFFFFFF. Check value: crc32("123456789") = cbf43926.
 */

const REFLECTED_POLYNOMIAL = 0xedb88320;
const INITIAL_REGISTER = 0xffffffff;
const FINAL_XOR = 0xffffffff;
const HEX_DIGITS = 8;

/** One entry per byte value: the CRC contribution of shifting that byte out. */
function buildCrcTable(polynomial: number): Uint32Array {
  const table = new Uint32Array(256);
  for (let byte = 0; byte < 256; byte++) {
    let remainder = byte;
    for (let bit = 0; bit < 8; bit++) {
      const lowBitSet = (remainder & 1) === 1;
      remainder = remainder >>> 1;
      if (lowBitSet) remainder ^= polynomial;
    }
    table[byte] = remainder >>> 0;
  }
  return table;
}

const CRC_TABLE = buildCrcTable(REFLECTED_POLYNOMIAL);

/** Standard table-driven, byte-at-a-time reflected CRC-32 over raw bytes. */
export function crc32(bytes: Uint8Array): number {
  let register = INITIAL_REGISTER;
  for (const byte of bytes) {
    const index = (register ^ byte) & 0xff;
    register = (register >>> 8) ^ CRC_TABLE[index]!;
  }
  return (register ^ FINAL_XOR) >>> 0;
}

export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);
  return crc32(bytes).toString(16).padStart(HEX_DIGITS, "0");
}
