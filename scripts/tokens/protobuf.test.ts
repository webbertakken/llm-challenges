import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { protoFields, protoMessage, protoVarint } from "./protobuf.ts";
import { encodeMessage } from "./protobuf.test-helpers.ts";

describe("protoFields", () => {
  it("groups varints and length-delimited fields by number", () => {
    const fields = protoFields(encodeMessage({ 1: 300, 2: "hi", 3: { 1: 7 } }));
    assert.equal(protoVarint(fields, 1), 300);
    assert.equal(protoVarint(protoMessage(fields, 3)!, 1), 7);
    assert.equal(protoVarint(fields, 9), 0);
    assert.equal(protoMessage(fields, 9), null);
  });

  it("skips fixed-width fields", () => {
    const fixed64 = [(4 << 3) | 1, 1, 2, 3, 4, 5, 6, 7, 8];
    const fixed32 = [(5 << 3) | 5, 1, 2, 3, 4];
    const fields = protoFields(Uint8Array.from([...fixed64, ...fixed32, ...encodeMessage({ 6: 42 })]));
    assert.equal(protoVarint(fields, 6), 42);
  });

  it("decodes varints wider than 32 bits", () => {
    assert.equal(protoVarint(protoFields(encodeMessage({ 1: 6_871_128_000 })), 1), 6_871_128_000);
  });

  it("rejects truncated input", () => {
    assert.throws(() => protoFields(Uint8Array.from([(1 << 3) | 2, 5, 1])), /truncated/);
    assert.throws(() => protoFields(Uint8Array.from([(1 << 3) | 0, 0x80])), /truncated/);
  });

  it("rejects an unknown wire type", () => {
    assert.throws(() => protoFields(Uint8Array.from([(1 << 3) | 3])), /wire type 3/);
  });
});
