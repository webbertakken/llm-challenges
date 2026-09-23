/** Encodes a nested `{ field: number | string | message }` object as protobuf, for tests. */
export type TestMessage = { readonly [field: number]: number | string | TestMessage };

function varint(n: bigint): number[] {
  const out: number[] = [];
  let v = n;
  do {
    let byte = Number(v & 0x7fn);
    v >>= 7n;
    if (v > 0n) byte |= 0x80;
    out.push(byte);
  } while (v > 0n);
  return out;
}

export function encodeMessage(message: TestMessage): Uint8Array {
  const out: number[] = [];
  for (const [key, value] of Object.entries(message)) {
    const field = BigInt(key);
    if (typeof value === "number") {
      out.push(...varint((field << 3n) | 0n), ...varint(BigInt(value)));
      continue;
    }
    const bytes = typeof value === "string" ? new TextEncoder().encode(value) : encodeMessage(value);
    out.push(...varint((field << 3n) | 2n), ...varint(BigInt(bytes.length)), ...bytes);
  }
  return Uint8Array.from(out);
}
