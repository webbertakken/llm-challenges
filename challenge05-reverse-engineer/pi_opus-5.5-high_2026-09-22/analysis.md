# Analysis of `mystery.mjs`

## Verdict

`mystery.mjs` computes the **CRC-32** checksum of the **UTF-8 bytes** of its input and returns it as
**8 lowercase hexadecimal digits**, zero-padded.

The variant is the ubiquitous IEEE 802.3 CRC-32 used by zlib, gzip, PNG, ZIP and Ethernet, catalogued as
**CRC-32/ISO-HDLC**:

| Parameter | Value |
| --- | --- |
| Width | 32 bits |
| Polynomial | `0x04C11DB7` (normal form), used here bit-reversed as `0xEDB88320` |
| Initial register | `0xFFFFFFFF` |
| Reflect input / output | yes / yes (LSB-first processing, implied by the right-shifting algorithm) |
| Final XOR | `0xFFFFFFFF` |
| Check value (`"123456789"`) | `cbf43926` |
| Output encoding | 8 lowercase hex digits, big-endian digit order, leading zeros kept |

## Stage by stage

1. **Lookup table (`_t`, line 3).** An IIFE runs once at module load. For every byte value `n` in
   `0..255` it performs eight rounds of "if the low bit is set, shift right and XOR `0xEDB88320`,
   otherwise just shift right" and stores `c >>> 0` (forced unsigned). That is the classic 256-entry table of
   CRC remainders for a single byte, for the reflected polynomial `0xEDB88320`.
2. **Input normalisation (line 5).** A string is converted to bytes with `TextEncoder`, i.e. UTF-8. (A
   non-string, e.g. a `Uint8Array`, is used as-is; the public contract is `string => string`, so that
   branch is irrelevant to callers of `solution`.)
3. **Register initialisation (line 6).** `r = 0xFFFFFFFF`, the standard CRC-32 preset. `i = -1` plus the
   pre-increment `while (++i < q.length)` is just an obfuscated `for (i = 0; i < length; i++)`.
4. **Table-driven update (line 7).** For each byte: `r = (r >>> 8) ^ table[(r ^ byte) & 0xFF]`. The low
   byte of the register is combined with the incoming byte, the register is shifted one byte to the right
   (reflected, LSB-first CRC) and the precomputed remainder is folded back in. Intermediate values may be
   negative as signed 32-bit integers, but only the bit pattern matters.
5. **Final XOR (line 8).** `(r ^ 0xFFFFFFFF) >>> 0` inverts all bits (the CRC-32 "xorout") and
   reinterprets the result as an unsigned 32-bit number.
6. **Hex formatting (lines 9-11).** A `do ... while` loop peels off 4 bits at a time, prepending the
   matching digit from `"0123456789abcdef"`, which is a hand-rolled `v.toString(16)` (lowercase). The
   `do` form guarantees at least one digit (`"0"` for zero). The final loop left-pads with `"0"` to 8
   characters, i.e. `padStart(8, "0")`. Since the value is below `2^32`, the result is always exactly
   8 characters.

## The clean reimplementation

`solution.ts` names each concept instead of inlining it: the reflected polynomial, the initial register
and final XOR are named constants; `crcOfByte` builds one table entry; `CRC_TABLE` is built with
`Array.from`; `crc32(bytes)` runs the table-driven loop over a `Uint8Array`; and `solution` composes
UTF-8 encoding, `crc32` and `toString(16).padStart(8, "0")`.

## Edge cases

- **Empty string:** no bytes are processed, so the register stays `0xFFFFFFFF` and the final XOR yields
  `0`, formatted as `"00000000"`.
- **Leading zeros:** CRCs below `0x10000000` are zero-padded (`do/while` + pad loop in the original,
  `padStart` in the solution). The harness searches for 50 such inputs and compares them explicitly.
- **Non-ASCII / multi-byte characters:** the checksum is over UTF-8 bytes, not UTF-16 code units. `"é"`
  hashes the two bytes `C3 A9`, `"€"` the three bytes `E2 82 AC`, and an astral character like `"😀"` its
  four-byte sequence (the surrogate pair is combined before encoding). Canonically equivalent strings
  that differ in code points (precomposed `é` vs `e` + combining acute) give different CRCs: there is no
  Unicode normalisation.
- **Lone surrogates:** `TextEncoder` replaces an unpaired surrogate with U+FFFD (`EF BF BD`), so `"\ud800"`,
  `"\udfff"` and `"\ufffd"` all produce the same CRC. The solution reuses `TextEncoder`, so this behaviour
  is identical by construction.
- **NUL and control characters:** treated like any other byte (`"\0"` is one `00` byte and changes the
  CRC; CRC-32's non-zero preset makes leading zero bytes significant).
- **Long inputs:** processing is linear and allocation-free apart from the encoded byte array; 100 000
  characters are covered by the harness.

## Proof of equivalence

`equivalence.test.ts` (run with `npx tsx equivalence.test.ts`) compares `solution` with the original
`mystery.mjs`:

1. Published CRC-32 vectors (`""`, `"a"`, `"abc"`, `"123456789"` -> `cbf43926`, the quick brown fox ->
   `414fa339`) against both implementations, pinning the exact variant.
2. Hand-picked edge cases: empty, NUL, CR/LF, boundaries of each UTF-8 length class, BOM, combining
   characters, emoji ZWJ sequences, lone and reversed surrogates, long repetitive strings.
3. Every one of the 65 536 single UTF-16 code units.
4. Every ASCII byte embedded in surrounding text.
5. 20 000 seeded random strings (mixing ASCII, 2-, 3- and 4-byte UTF-8 and lone surrogates) plus 200
   random strings of up to 5 000 characters.
6. 50 inputs whose CRC has a leading hex zero (padding).
7. An independent bit-at-a-time CRC-32 (no table) cross-checks the table-driven solution.

Result: `PASS: 87953 checks`. The challenge grader also reports `Result: EQUIVALENT` (0 mismatches).
