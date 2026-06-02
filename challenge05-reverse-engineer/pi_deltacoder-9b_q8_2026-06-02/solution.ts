/**
 * CRC-32 checksum calculation
 * 
 * This function computes the CRC-32 checksum of the input string and returns
 * it as an 8-character lowercase hexadecimal string.
 */
export function solution(input: string): string {
  // Generate CRC-32 lookup table
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) !== 0
        ? (0xEDB88320 ^ (c >>> 1))
        : (c >>> 1);
      table[n] = c >>> 0;
    }
  }

  // Encode input to bytes and compute CRC-32
  const encoder = new TextEncoder();
  const bytes = encoder.encode(input);
  let crc = 0xFFFFFFFF;

  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xFF];
  }

  // Final XOR with 0xFFFFFFFF
  crc = crc ^ 0xFFFFFFFF;
  crc = crc >>> 0;

  // Convert to 8-character lowercase hex string
  let hex = crc.toString(16).toLowerCase();
  while (hex.length < 8) {
    hex = "0" + hex;
  }

  return hex;
}
