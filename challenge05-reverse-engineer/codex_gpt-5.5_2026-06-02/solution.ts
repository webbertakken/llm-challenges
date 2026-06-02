const CRC32_POLYNOMIAL_REFLECTED = 0xedb88320;
const INITIAL_REMAINDER = 0xffffffff;
const FINAL_XOR = 0xffffffff;

const crc32Table: readonly number[] = buildCrc32Table();

function buildCrc32Table(): number[] {
  const table: number[] = [];

  for (let byte = 0; byte < 256; byte += 1) {
    let remainder = byte;

    for (let bit = 0; bit < 8; bit += 1) {
      if ((remainder & 1) === 1) {
        remainder = CRC32_POLYNOMIAL_REFLECTED ^ (remainder >>> 1);
      } else {
        remainder >>>= 1;
      }
    }

    table[byte] = remainder >>> 0;
  }

  return table;
}

export function solution(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let remainder = INITIAL_REMAINDER;

  for (const byte of bytes) {
    const tableIndex = (remainder ^ byte) & 0xff;
    remainder = (remainder >>> 8) ^ crc32Table[tableIndex];
  }

  const checksum = (remainder ^ FINAL_XOR) >>> 0;
  return checksum.toString(16).padStart(8, "0");
}
