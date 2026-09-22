# Challenge 05 — Reverse Engineering Analysis

## 1. Algorithm Identification

The obfuscated function in `mystery.mjs` is the standard **CRC-32 (Cyclic Redundancy Check 32-bit)**, specifically the **IEEE 802.3 / ISO 3309** variant (also widely known in POSIX `cksum -o 3`, Ethernet, zlib, PNG, and gzip).

### Exact Mathematical Parameters
- **Algorithm Family:** CRC-32 / ISO-3309 / IEEE-802.3
- **Normal Polynomial:** `0x04C11DB7` ($x^{32} + x^{26} + x^{23} + x^{22} + x^{16} + x^{12} + x^{11} + x^{10} + x^8 + x^7 + x^5 + x^4 + x^2 + x + 1$)
- **Reversed (Reflected) Polynomial:** `0xEDB88320`
- **Initial Remainder (`init`):** `0xFFFFFFFF`
- **Reflect Input (`refIn`):** `true` (least-significant bit processed first)
- **Reflect Output (`refOut`):** `true`
- **Final XOR Mask (`xorOut`):** `0xFFFFFFFF`
- **Check Value for string `"123456789"`:** `cbf43926`

---

## 2. Step-by-Step Deconstruction of `mystery.mjs`

### Stage 1: Lookup Table Precomputation (`_t`)
```javascript
const _t = (() => {
  const a = [];
  let c, n, k;
  for (n = 0; n < 0x100; n++) {
    c = n;
    for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    a[n] = c >>> 0;
  }
  return a;
})();
```
- Iterates through all 256 possible single-byte values ($0 \dots 255$).
- For each byte, it shifts 8 bits rightward (reflected/LSB-first representation). If the low bit is 1, it XORs with the reflected polynomial `0xEDB88320`.
- The unsigned shift `c >>> 0` coerces the 32-bit signed bitwise result into an unsigned 32-bit integer.
- The resulting 256-element array `_t` serves as the acceleration table for the Sarwate CRC algorithm.

### Stage 2: Input Encoding
```javascript
const q = (typeof z === "string") ? new TextEncoder().encode(z) : z;
```
- Converts the input string into a `Uint8Array` of UTF-8 encoded bytes.
- This ensures that multi-byte Unicode code points (such as emojis or accented characters) are transformed into their canonical byte representation before hashing.

### Stage 3: Byte-by-Byte Accumulation Loop
```javascript
let r = 0xFFFFFFFF, i = -1;
while (++i < q.length) r = (r >>> 8) ^ _t[(r ^ q[i]) & 0xFF];
```
- Initializes the running remainder `r` to `0xFFFFFFFF`.
- For each byte `q[i]`, computes the index `(r ^ q[i]) & 0xFF`.
- Shifts `r` right by 8 bits (`r >>> 8`) and XORs with the precomputed table value.

### Stage 4: Inversion and Formatting
```javascript
r = (r ^ 0xFFFFFFFF) >>> 0;
let o = "", v = r;
do { o = "0123456789abcdef"[v & 15] + o; v >>>= 4; } while (v);
while (o.length < 8) o = "0" + o;
return o;
```
- Inverts all 32 bits (`r ^ 0xFFFFFFFF`) as required by the IEEE 802.3 standard.
- Formats the 32-bit unsigned integer into an 8-character lowercase hexadecimal string:
  - Iteratively peels off 4-bit nibbles (`v & 15`), indexing into `"0123456789abcdef"`.
  - Right-pads or prepends leading zeroes until the string length is exactly 8 characters.

---

## 3. Output Format and Edge Cases

- **Output Format:** Lowercase 8-character hex string (e.g. `00000000`, `cbf43926`).
- **Empty String (`""`):** Initial value `0xFFFFFFFF` XORed with `0xFFFFFFFF` yields `0x00000000`, formatted as `"00000000"`.
- **Non-ASCII / Multi-byte UTF-8 Characters:** Because `TextEncoder().encode()` is used, each UTF-8 byte is processed individually. For instance, the Euro symbol `€` is encoded as 3 bytes `[0xE2, 0x82, 0xAC]`.
- **Zero Bytes (`\x00`):** Handled transparently by the byte loop without truncating.
