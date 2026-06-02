// Pre-compute the CRC-32 table for standard polynomial 0xEDB88320 (reversed)
const crcTable = new Uint32Array(256);
const POLY = 0xEDB88320;

for (let i = 0; i < 256; i++) {
    let crc = i;
    for (let j = 0; j < 8; j++) {
        crc = (crc & 1) ? (crc >>> 1) ^ POLY : crc >>> 1;
    }
    crcTable[i] = crc >>> 0;
}

/**
 * Computes the CRC-32 checksum of a given input string.
 * This implements the standard IEEE 802.3 CRC-32 algorithm.
 */
export function solution(input: string): string {
    const bytes = new TextEncoder().encode(input);
    let crc = 0xFFFFFFFF; // Initial CRC value
    
    for (let i = 0; i < bytes.length; i++) {
        const tableIndex = (crc ^ bytes[i]) & 0xFF;
        crc = (crc >>> 8) ^ crcTable[tableIndex];
    }
    
    // Final XOR and cast to unsigned 32-bit integer
    crc = (crc ^ 0xFFFFFFFF) >>> 0;
    
    // Format as an 8-character lowercase hexadecimal string
    return crc.toString(16).padStart(8, '0');
}
