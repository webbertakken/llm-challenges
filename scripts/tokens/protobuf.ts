/**
 * A minimal, schemaless protobuf reader: enough to walk known field numbers of
 * a message without its `.proto` definition.
 */
export type ProtoValue =
  | { readonly wire: "varint"; readonly value: bigint }
  | { readonly wire: "bytes"; readonly bytes: Uint8Array };

export type ProtoFields = ReadonlyMap<number, readonly ProtoValue[]>;

export function protoFields(buf: Uint8Array): ProtoFields {
  const fields = new Map<number, ProtoValue[]>();
  let i = 0;
  const readVarint = (): bigint => {
    let result = 0n;
    let shift = 0n;
    for (;;) {
      if (i >= buf.length) throw new Error("protobuf: truncated varint");
      const byte = buf[i++];
      result |= BigInt(byte & 0x7f) << shift;
      if ((byte & 0x80) === 0) return result;
      shift += 7n;
    }
  };
  const skip = (n: number): void => {
    if (i + n > buf.length) throw new Error("protobuf: truncated field");
    i += n;
  };
  while (i < buf.length) {
    const key = readVarint();
    const field = Number(key >> 3n);
    const wire = Number(key & 7n);
    const push = (value: ProtoValue): void => {
      fields.set(field, [...(fields.get(field) ?? []), value]);
    };
    switch (wire) {
      case 0:
        push({ wire: "varint", value: readVarint() });
        break;
      case 1:
        skip(8);
        break;
      case 2: {
        const length = Number(readVarint());
        const start = i;
        skip(length);
        push({ wire: "bytes", bytes: buf.subarray(start, start + length) });
        break;
      }
      case 5:
        skip(4);
        break;
      default:
        throw new Error(`protobuf: unsupported wire type ${wire} for field ${field}`);
    }
  }
  return fields;
}

/** The first varint of a field, or 0 (protobuf's default) when absent. */
export function protoVarint(fields: ProtoFields, field: number): number {
  const value = fields.get(field)?.find((v) => v.wire === "varint");
  return value?.wire === "varint" ? Number(value.value) : 0;
}

/** The first length-delimited field decoded as a nested message, or null when absent. */
export function protoMessage(fields: ProtoFields, field: number): ProtoFields | null {
  const value = fields.get(field)?.find((v) => v.wire === "bytes");
  return value?.wire === "bytes" ? protoFields(value.bytes) : null;
}
