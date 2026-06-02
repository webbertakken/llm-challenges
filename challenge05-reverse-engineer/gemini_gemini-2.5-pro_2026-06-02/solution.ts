/**
 * Caches the CRC32 lookup table.
 */
const crc32Table = (() => {
    const table: number[] = [];
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        table[n] = c >>> 0; // Ensure unsigned 32-bit integer
    }
    return table;
})();

/**
 * Calculates the CRC32 checksum of a string.
 * The implementation is equivalent to the algorithm used in GZIP and PNG.
 *
 * @param input The input string to compute the checksum for.
 * @returns The CRC32 checksum as an 8-character lowercase hexadecimal string.
 */
export function solution(input: string): string {
    // 1. Encode the string to a UTF-8 byte array.
    const bytes = new TextEncoder().encode(input);

    // 2. Initialize CRC register.
    let crc = 0xFFFFFFFF;

    // 3. Process each byte using the lookup table.
    for (let i = 0; i < bytes.length; i++) {
        crc = (crc >>> 8) ^ crc32Table[(crc ^ bytes[i]) & 0xFF];
    }

    // 4. Finalize the CRC value by XORing with 0xFFFFFFFF.
    const finalCrc = (crc ^ 0xFFFFFFFF) >>> 0;

    // 5. Convert the 32-bit number to an 8-character hexadecimal string.
    const hexString = finalCrc.toString(16);

    // 6. Pad with leading zeros to ensure an 8-character length.
    return hexString.padStart(8, '0');
}
