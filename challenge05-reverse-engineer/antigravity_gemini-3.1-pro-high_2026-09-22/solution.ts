const TABLE = new Uint32Array(256);
const POLY = 0xedb88320;

for (let i = 0; i < 256; i++) {
  let crc = i;
  for (let j = 0; j < 8; j++) {
    if (crc & 1) {
      crc = (crc >>> 1) ^ POLY;
    } else {
      crc = crc >>> 1;
    }
  }
  TABLE[i] = crc >>> 0;
}

/**
 * Computes the standard CRC-32 (IEEE 802.3) checksum for a given string.
 * The output is an 8-character lowercase hexadecimal string, zero-padded.
 */
export function solution(input: string): string {
  const buffer = new TextEncoder().encode(input);
  let crc = 0xffffffff;
  
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i]!;
    const lookupIndex = (crc ^ byte) & 0xff;
    crc = (crc >>> 8) ^ TABLE[lookupIndex]!;
  }
  
  crc = (crc ^ 0xffffffff) >>> 0;
  
  return crc.toString(16).padStart(8, '0');
}
