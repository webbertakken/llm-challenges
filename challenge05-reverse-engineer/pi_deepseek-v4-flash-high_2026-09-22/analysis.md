# Reverse-engineering `mystery.mjs`

## Algorithm

`mystery.mjs` computes **CRC-32/ISO-HDLC**, the "standard" 32-bit cyclic
redundancy check used by zlib/gzip, PNG, ZIP and many network protocols. It is
the checksum behind `zlib.crc32`, the PNG `IEND`/`IDAT` chunk checks and the
Ethernet/zlib CRC.

### Exact variant and parameters

| Parameter | Value |
| --- | --- |
| Width | 32 bits |
| Polynomial | `0x04C11DB7` (normal form), `0xEDB88320` (reflected) |
| Initial remainder | `0xFFFFFFFF` |
| `refin` (reflect input bytes) | `true` |
| `refout` (reflect output) | `true` |
| Final XOR | `0xFFFFFFFF` |
| Check (`"123456789"`) | `0xCBF43926` |
| Text encoding | input string → UTF-8 bytes |
| Output format | exactly 8 lowercase hexadecimal digits, zero-padded |

Because both input and output are reflected, the implementation never needs an
explicit bit-reversal step: it works on the bit-reversed polynomial directly.
This is the standard "Rocksoft model" CRC-32 (the model that zlib, gzip and PNG
all use), not the CRC-32/BZIP2 or CRC-32/MPEG-2 variants, which differ in
reflectivity and in the initial/final values.

## What each stage of the obfuscated code does

The whole file is one `_t` table built by an IIFE, plus one exported function
`$`. Nothing is genuinely hidden except the names and the fact that the table,
the loop and the formatting are fused into a single screenful.

### 1. `_t` — the 256-entry lookup table (lines 3)

```js
for (n = 0; n < 0x100; n++) {
  c = n;
  for (k = 0; k < 8; k++)
    c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
  a[n] = c >>> 0;
}
```

For every possible byte value `0..255`, this performs a division of that byte
by the CRC polynomial, one bit at a time, for exactly eight bit positions. On
each step it looks at the low bit: if set, it shifts right and XORs the
bit-reversed polynomial `0xEDB88320`; otherwise it just shifts right. The
`>>> 1` is a **logical** right shift, which is what keeps the operation in
unsigned 32-bit arithmetic; `c >>> 0` at the end pins the result as an unsigned
32-bit integer. The result is the precomputed remainder table that lets the
real loop process one byte per iteration instead of eight.

`0xEDB88320` is the tell: it is `0x04C11DB7` bit-reversed, the standard
reflected CRC-32 polynomial.

### 2. Input coercion (line 5)

```js
const q = (typeof z === "string") ? new TextEncoder().encode(z) : z;
```

If the argument is a string it is encoded to **UTF-8 bytes**; otherwise it is
assumed to already be a byte sequence (array or typed array). The challenge
fixes the public type as `string => string`, so in practice the UTF-8 branch is
the one that runs. `TextEncoder` produces standard UTF-8, including multi-byte
sequences for non-ASCII characters and U+FFFD for unpaired surrogates.

### 3. The CRC loop (lines 6–7)

```js
let r = 0xFFFFFFFF, i = -1;
while (++i < q.length) r = (r >>> 8) ^ _t[(r ^ q[i]) & 0xFF];
```

- `r` starts at the initial value `0xFFFFFFFF`.
- For each input byte, `(r ^ byte) & 0xFF` selects a table entry from the low
  byte of the running remainder XORed with the input byte.
- `r >>> 8` shifts the remainder down by one byte and XORs in the table entry.
  This is exactly one reflected polynomial division per byte, accelerated by
  the table.

### 4. Finalisation (line 8)

```js
r = (r ^ 0xFFFFFFFF) >>> 0;
```

The final XOR flips all 32 bits (the CRC's post-conditioning) and `>>> 0`
normalises the result to an unsigned 32-bit value so that later bit
operations behave.

### 5. Hexadecimal formatting (lines 9–11)

```js
let o = "", v = r;
do { o = "0123456789abcdef"[v & 15] + o; v >>>= 4; } while (v);
while (o.length < 8) o = "0" + o;
```

Nibbles are peeled off from the least-significant end and **prepended**, which
reverses them into most-significant-first order. The digits come from the
lowercase string `"0123456789abcdef"`, so the output is lowercase. The
`do…while` guarantees at least one digit even when the checksum is `0`, and the
final padding loop widens anything shorter than eight digits. Together these
always yield exactly eight hexadecimal characters.

## Output format

- Always exactly 8 characters.
- Lowercase hexadecimal (nibble alphabet `0-9a-f`).
- Zero-padded on the left, e.g. empty input → `"00000000"`.

## Edge cases

- **Empty string.** The loop body never runs, so `r` stays `0xFFFFFFFF`; the
  final XOR turns it into `0`; the `do…while` emits `"0"` and the padding widens
  it to `"00000000"`. The zero-padding branch exists precisely for this case.
- **Leading-zero checksums.** Any checksum below `0x10000000` needs the padding
  loop; without it the output length would vary. The pad loop makes the format
  fixed-width, which matters when the value is used in a protocol field.
- **Non-ASCII / multi-byte characters.** The CRC is computed over UTF-8 bytes,
  never over UTF-16 code units. `"é"` (`0xC3 0xA9`), `"日本語"` (3 bytes per
  character) and `"😀"` (4-byte UTF-8 sequence) all hash as their UTF-8 byte
  sequences, so the result is encoding-dependent and locale-independent.
- **Unpaired surrogates.** `TextEncoder` replaces an isolated `\uD800` or
  `\uDFFF` with U+FFFD (`0xEF 0xBF 0xBD`) rather than throwing, so such strings
  are still hashed deterministically.
- **Non-string arguments.** The original accepts a byte array/typed array
  directly on the `typeof z === "string"` false branch. The challenge narrows
  the public API to strings, so the clean reimplementation deliberately exposes
  only the string form.
- **Very long inputs.** The loop is linear in the number of bytes; the table is
  built once at module load, so repeated calls have no setup cost.
- **Sign/unsigned behaviour.** All arithmetic uses unsigned shifts (`>>>`) and
  the results are normalised with `>>> 0`, so the 32-bit width never leaks sign
  bits into the hex output.
