# Analysis of `mystery.mjs`

## Verdict

`mystery.mjs` computes the **CRC-32 checksum (IEEE 802.3 / ISO 3309)** of the
UTF-8 encoding of its input and returns it as eight lowercase hexadecimal
digits. It is the exact variant used by zip, gzip, PNG, Ethernet and
`zlib.crc32`, known in the Rocksoft/`crcany` catalogue as `CRC-32` (also
`CRC-32/ISO-HDLC`):

| Parameter | Value |
| --- | --- |
| Width | 32 bits |
| Polynomial | `0x04C11DB7`, used in its bit-reversed (reflected) form `0xEDB88320` |
| Initial register | `0xFFFFFFFF` |
| Input reflected | yes (the reflected table makes this implicit) |
| Output reflected | yes |
| Final XOR | `0xFFFFFFFF` |
| Check value | `crc32("123456789") = 0xCBF43926` |
| Output encoding | 8 lowercase hex digits, zero-padded on the left |

## Stage by stage

### 1. `_t`: the 256-entry lookup table

```js
for (n = 0; n < 0x100; n++) {
  c = n;
  for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  a[n] = c >>> 0;
}
```

For every byte value `n` this runs the reflected (LSB-first) shift-register
eight times: shift right one bit, and if the bit that fell off was `1`, XOR in
the reflected generator polynomial `0xEDB88320`. The result is the CRC
contribution of that byte, which lets the main loop process a whole byte per
step instead of one bit at a time (Sarwate's table-driven algorithm). The
constant `0xEDB88320` is `0x04C11DB7` with its 32 bits reversed, which is what
identifies the polynomial as the IEEE one.

### 2. Input normalisation

```js
const q = (typeof z === "string") ? new TextEncoder().encode(z) : z;
```

Strings are turned into their UTF-8 bytes; anything else (a `Uint8Array`,
array-like of bytes) is used as is. Only the string path is part of the
contract, so `solution` takes a `string` and always UTF-8-encodes it.

### 3. The register loop

```js
let r = 0xFFFFFFFF, i = -1;
while (++i < q.length) r = (r >>> 8) ^ _t[(r ^ q[i]) & 0xFF];
```

The register starts at all ones (`init = 0xFFFFFFFF`). Each byte is XORed
into the low byte of the register, that low byte selects a table entry, the
register is shifted right by 8 and the entry is XORed in. `>>>` keeps the
arithmetic unsigned. The `while (++i < ...)` form is just an obfuscated
`for` loop over the bytes.

### 4. Final transform

```js
r = (r ^ 0xFFFFFFFF) >>> 0;
```

The final XOR with `0xFFFFFFFF` (equivalently `~r >>> 0`) and the `>>> 0`
converts the signed 32-bit result of `^` into an unsigned number in
`[0, 2^32)`.

### 5. Output encoding

```js
let o = "", v = r;
do { o = "0123456789abcdef"[v & 15] + o; v >>>= 4; } while (v);
while (o.length < 8) o = "0" + o;
```

A hand-rolled `r.toString(16)`: peel off four bits at a time, look up the
lowercase hex digit, prepend it, stop when nothing is left; then left-pad with
`"0"` to eight characters. The `do ... while` guarantees at least one digit, so
a CRC of zero becomes `"00000000"` rather than `""`. `solution` expresses the
same thing as `toString(16).padStart(8, "0")`.

## Output format

Always exactly 8 characters from `[0-9a-f]`, i.e. the 32-bit CRC as
big-endian, zero-padded, lowercase hex. No `0x` prefix, never uppercase.

## Edge cases

- **Empty string:** no bytes are processed, the register stays `0xFFFFFFFF`,
  the final XOR yields `0`, output `"00000000"`.
- **Non-ASCII / multi-byte characters:** the CRC runs over UTF-8 bytes, not
  UTF-16 code units. `"é"` contributes the two bytes `C3 A9`, `"日本語"` nine
  bytes, an emoji such as `"😀"` four bytes. A string's `.length` therefore
  says nothing about how many bytes are hashed.
- **Lone surrogates:** `TextEncoder` cannot encode an unpaired surrogate and
  substitutes U+FFFD (`EF BF BD`). Both implementations use `TextEncoder`, so
  `"\ud800"` hashes identically in each (as the replacement character). A
  correctly paired surrogate pair is encoded as its 4-byte code point.
- **NUL bytes:** `"\0"` is a real byte (`00`) and changes the CRC; it is not a
  terminator.
- **Long inputs:** the algorithm is linear and streams byte by byte; the
  harness checks inputs up to 64 KiB of `"x"` and multi-thousand-code-point
  random strings.
- **Non-string arguments:** `mystery.mjs` would accept a byte array directly;
  that path is outside the declared `(input: string) => string` contract and
  is deliberately not reproduced. `solution.ts` additionally exports a
  `crc32(bytes: Uint8Array): number` helper that is the same primitive.

## How equivalence was established

`equivalence.test.ts` compares `solution` with `mystery.mjs` on the published
check vectors (`""`, `"a"`, `"abc"`, `"123456789"`, the quick brown fox), a set
of hand-picked edge cases (NULs, BOM, U+FFFF, U+10FFFF, lone and swapped
surrogates, ZWJ emoji sequences, 64 KiB strings), and 6000+ seeded random
strings drawn from ASCII, arbitrary UTF-16 code units (which includes invalid
surrogate sequences) and arbitrary Unicode code points. Where available, every
result is also cross-checked against Node's built-in `zlib.crc32`, which
independently confirms the algorithm identification. All inputs match.
