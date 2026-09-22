# Reverse-Engineering Analysis: `mystery.mjs`

## 1. Algorithm Identification

The obfuscated function in `mystery.mjs` is an implementation of **CRC-32** (Cyclic Redundancy Check, 32-bit), specifically the standard **CRC-32 / ISO-HDLC / IEEE 802.3 / ITU-T V.42 / PKZIP / PNG / Gzip** variant.

### Exact Parameters (Rocksoft CRC Model)
- **Width:** 32 bits
- **Normal Polynomial:** `0x04C11DB7` ($x^{32} + x^{26} + x^{23} + x^{22} + x^{16} + x^{12} + x^{11} + x^{10} + x^8 + x^7 + x^5 + x^4 + x^2 + x + 1$)
- **Reversed (Reflected) Polynomial:** `0xEDB88320`
- **Initial Register Value (`Init`):** `0xFFFFFFFF`
- **Reflect Input Bytes (`RefIn`):** `true` (LSB-first bit reflection)
- **Reflect Output CRC (`RefOut`):** `true`
- **Final XOR Mask (`XorOut`):** `0xFFFFFFFF` (bitwise NOT)
- **Check value for ASCII `"123456789"`:** `0xCBF43926` -> `"cbf43926"`

---

## 2. Step-by-Step Code Deobfuscation

### Stage 1: Lookup Table Precomputation (`_t`)
```javascript
const _t = (() => { const a = []; let c, n, k; for (n = 0; n < 0x100; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); a[n] = c >>> 0; } return a; })();
```
- Iterates over all 256 possible byte values ($0 \le n < 256$).
- Performs an 8-iteration bitwise division simulation using the reversed generator polynomial `0xEDB88320`.
- Produces a 256-element lookup table representing the CRC contribution of each byte in reflected form.

### Stage 2: Input Encoding (`q`)
```javascript
const q = (typeof z === "string") ? new TextEncoder().encode(z) : z;
```
- Converts string input into a `Uint8Array` of UTF-8 encoded bytes via `TextEncoder`.
- Correctly handles multi-byte UTF-8 sequences (emojis, accented characters, CJK ideographs).

### Stage 3: CRC Register Accumulation
```javascript
let r = 0xFFFFFFFF, i = -1;
while (++i < q.length) r = (r >>> 8) ^ _t[(r ^ q[i]) & 0xFF];
```
- Initializes the 32-bit CRC accumulator `r` with `0xFFFFFFFF`.
- For each byte `q[i]`, computes the table index `(r ^ q[i]) & 0xFF`, shifts the accumulator right by 8 bits (`r >>> 8`), and XORs with the table entry.

### Stage 4: Post-Processing Final XOR
```javascript
r = (r ^ 0xFFFFFFFF) >>> 0;
```
- Inverts all 32 bits of the CRC register (equivalent to `~r >>> 0`), fulfilling the standard CRC-32 post-conditioning specification.

### Stage 5: Hexadecimal String Serialization
```javascript
let o = "", v = r;
do { o = "0123456789abcdef"[v & 15] + o; v >>>= 4; } while (v);
while (o.length < 8) o = "0" + o;
return o;
```
- Manually formats the 32-bit unsigned integer `r` into an 8-character, lowercase hexadecimal string padded with leading zeros (equivalent to `r.toString(16).padStart(8, "0")`).

---

## 3. Output Format & Edge Cases

- **Output Format:** Exactly 8 lowercase hexadecimal characters `[0-9a-f]{8}`.
- **Empty String (`""`):** Initial `0xFFFFFFFF` ^ Final `0xFFFFFFFF` = `0x00000000` -> `"00000000"`.
- **Standard Check Vector (`"123456789"`):** Produces `"cbf43926"`.
- **Multi-Byte Characters (`"Hello, 🌍!"`):** `TextEncoder` decomposes `🌍` into 4 UTF-8 bytes (`0xF0 0x9F 0x8C 0x8D`), which are processed deterministically in sequence.
