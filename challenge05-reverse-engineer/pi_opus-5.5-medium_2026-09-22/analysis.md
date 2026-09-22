# Analysis of `mystery.mjs`

## Algorithm

`mystery.mjs` computes **CRC-32** in its most common variant, **CRC-32/ISO-HDLC** (a.k.a. IEEE 802.3,
the CRC used by zlib, gzip, ZIP, PNG and Ethernet), over the **UTF-8 bytes** of the input string, and
returns it as **8 lowercase hexadecimal digits**.

| Parameter | Value |
| --- | --- |
| Width | 32 bits |
| Polynomial | `0x04C11DB7` (normal), used in reflected form `0xEDB88320` |
| Init | `0xFFFFFFFF` |
| RefIn / RefOut | true / true (LSB-first, right-shifting implementation) |
| XorOut | `0xFFFFFFFF` |
| Check (`"123456789"`) | `cbf43926` |
| Output | `crc.toString(16)` left-padded with `0` to 8 chars, lowercase |

## Stage by stage

1. **`_t` (IIFE at module load): table generation.** For every byte value `n` in `0..255` it runs 8
   rounds of "if the low bit is set, shift right and XOR with `0xEDB88320`, else just shift right". That
   is bit-serial polynomial division in the reflected domain; the result `a[n]` is the CRC remainder
   contribution of byte `n`. `>>> 0` keeps the entries as unsigned 32-bit numbers.
2. **Input normalisation:** `typeof z === "string" ? new TextEncoder().encode(z) : z`: strings are UTF-8
   encoded; anything else is assumed to already be a byte array (the typed API only takes strings).
3. **Register init:** `r = 0xFFFFFFFF` (the standard pre-inversion so leading zero bytes affect the CRC).
4. **Main loop** (`while (++i < q.length)` is just a `for` over the bytes): the classic byte-at-a-time
   table-driven update `r = (r >>> 8) ^ table[(r ^ byte) & 0xFF]`.
5. **Finalisation:** `(r ^ 0xFFFFFFFF) >>> 0`: post-inversion, then coerce to an unsigned 32-bit number.
6. **Hex formatting:** the `do ... while (v)` loop emits nibbles from the least significant upwards,
   prepending the corresponding lowercase hex digit (a hand-rolled `toString(16)`, which still emits
   `"0"` for a zero CRC thanks to `do/while`), then `while (o.length < 8)` left-pads with zeros (a
   hand-rolled `padStart(8, "0")`).

The clean reimplementation in `solution.ts` expresses the same stages with named constants:
`REFLECTED_POLYNOMIAL`, a `CRC_TABLE` built with `Array.from`, a `crc32(bytes)` function and
`toString(16).padStart(8, "0")` formatting.

## Output format

Always exactly 8 characters from `[0-9a-f]`, i.e. the unsigned CRC in big-endian hex notation with
leading zeros preserved (e.g. an input whose CRC is `0x0a1b2c3d` yields `"0a1b2c3d"`, not `"a1b2c3d"`).

## Edge cases

- **Empty string:** no bytes processed, so `0xFFFFFFFF ^ 0xFFFFFFFF = 0` gives `"00000000"`.
- **Non-ASCII:** characters are hashed as their UTF-8 byte sequences (1 to 4 bytes), not as UTF-16 code
  units or code points, e.g. `"é"` hashes the two bytes `C3 A9`; astral characters such as emoji hash 4 bytes.
- **Lone surrogates:** `TextEncoder` replaces unpaired surrogates with U+FFFD (`EF BF BD`), so `"\ud800"`
  and `"\udc00"` (and `"\ufffd"`) all produce the same CRC. `solution.ts` uses `TextEncoder` too, so this
  behaviour is preserved exactly.
- **NUL bytes / long inputs:** handled like any other byte; there is no length limit other than memory.
- **Leading zero nibbles:** preserved by the padding step.
- **Non-string input:** the obfuscated function also accepts a byte array directly; the required
  `(input: string) => string` signature does not expose that path.

## Evidence

- `equivalence.test.ts` checks published CRC-32 vectors (`""`, `"123456789"` -> `cbf43926`,
  `"The quick brown fox jumps over the lazy dog"` -> `414fa339`, ...), hand-picked edge cases (NUL,
  multi-byte, lone surrogates, 10 000-character input, all 256 Latin-1 code units), inputs whose CRC
  starts with `0`, and 20 000 seeded random strings mixing ASCII, BMP, surrogate and astral characters.
  All 20 070 comparisons match.
- The challenge grader reports `Mismatches: 0`, `Result: EQUIVALENT`.
