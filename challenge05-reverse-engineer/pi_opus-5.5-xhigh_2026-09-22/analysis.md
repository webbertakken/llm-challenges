# What `mystery.mjs` computes

**It is CRC-32 over the UTF-8 bytes of the input string, returned as 8 lowercase hex digits.**
The variant is the ubiquitous "CRC-32" of zlib, gzip, PNG, ZIP, Ethernet (IEEE 802.3) and
`cksum -a crc32b`. Its catalogue name is **CRC-32/ISO-HDLC**, also known as CRC-32/ADCCP, CRC-32/V-42,
CRC-32/XZ or PKZIP.

| Rocksoft parameter | Value | Where it appears in the obfuscated code |
| --- | --- | --- |
| width | 32 | the `>>> 0` normalisations, the 8-hex-digit output |
| poly | `0x04C11DB7` | as its bit reversal `0xEDB88320` in the table builder |
| init | `0xFFFFFFFF` | `let r = 0xFFFFFFFF` |
| refin | true | bytes enter LSB-first: `(r ^ byte) & 0xFF` indexes the table, and the register shifts **right** |
| refout | true | implied by the right-shifting (reflected) register: no final bit reversal is needed |
| xorout | `0xFFFFFFFF` | `r = (r ^ 0xFFFFFFFF) >>> 0` |
| check | `0xCBF43926` | `mystery("123456789") === "cbf43926"` |
| residue | `0xDEBB20E3` | property of the parameters, not visible in the code |

The implementation technique is **Sarwate's table-driven, byte-at-a-time CRC**: 256 precomputed
remainders, one table lookup per input byte.

## Stage by stage

```js
const _t = (() => { ... for (n = 0; n < 0x100; n++) { c = n; for (k = 0; k < 8; k++)
  c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); a[n] = c >>> 0; } return a; })();
```

1. **Table construction (IIFE, runs once at module load).**
   - For every byte value `n` it performs 8 rounds of reflected polynomial division: shift right, and if the
     bit that fell off was 1, XOR in the reversed polynomial `0xEDB88320`.
   - `a[n]` is the resulting 32-bit remainder, forced unsigned with `>>> 0`, because JS bitwise operators yield
     signed 32-bit integers.
   - This is the standard CRC-32 table: `_t[1] = 0x77073096`, `_t[255] = 0x2D02EF8D`.

```js
const q = (typeof z === "string") ? new TextEncoder().encode(z) : z;
```

2. **Input normalisation.**
   - Strings are converted to their **UTF-8** byte sequence with `TextEncoder`.
   - Anything else is assumed to already be a byte sequence (`Uint8Array`, `Buffer`, plain number array) and is
     used as is.

```js
let r = 0xFFFFFFFF, i = -1;
while (++i < q.length) r = (r >>> 8) ^ _t[(r ^ q[i]) & 0xFF];
```

3. **Register initialisation and the main loop.**
   - The register starts at all ones.
   - For each byte, the low byte of the register is XORed with the input byte to pick a table entry, and the
     register shifts right by 8 and absorbs that entry.
   - The `++i` pre-increment starting from `-1` is simply a disguised `for (i = 0; i < n; i++)`.
   - During the loop the register may be a *negative* int32, which is harmless because only its bit pattern
     matters.

```js
r = (r ^ 0xFFFFFFFF) >>> 0;
```

4. **Final transform.** XOR with all ones (xorout), then `>>> 0` to reinterpret the bit pattern as an
   unsigned integer in `[0, 2³²)`.

```js
let o = "", v = r;
do { o = "0123456789abcdef"[v & 15] + o; v >>>= 4; } while (v);
while (o.length < 8) o = "0" + o;
```

5. **Output encoding.**
   - A hand-rolled `Number.prototype.toString(16)`: it peels off the low nibble, prepends its lowercase hex
     digit and shifts right by 4, until nothing is left.
   - The `do…while` guarantees at least one digit, so 0 becomes `"0"`.
   - It then left-pads with `"0"` to exactly 8 characters.
   - The result is the checksum's **numeric value in big-endian digit order**, the conventional way CRC-32 is
     printed (e.g. `cbf43926`). It is *not* the little-endian byte order in which zlib appends it to a stream.

## Output format

Always exactly **8 characters, `[0-9a-f]{8}`**: lowercase, zero-padded, no prefix. For example:

| Input | Output |
| --- | --- |
| `""` | `00000000` |
| `"a"` | `e8b7be43` |
| `"abc"` | `352441c2` |
| `"123456789"` | `cbf43926` |
| `"The quick brown fox jumps over the lazy dog"` | `414fa339` |

## Edge cases

- **Empty string.** No bytes are processed, so the result is `init ^ xorout = 0xFFFFFFFF ^ 0xFFFFFFFF = 0`,
  which is `"00000000"`. This is the only way to hit the `do…while` zero case without forging.
- **Leading zeros.** Any checksum below `0x10000000` needs padding. About 1 in 16 inputs does. The harness also
  forges ASCII inputs whose CRC is exactly `0x00000000`, `0x00000001`, `0x0000FFFF`, `0x7FFFFFFF`,
  `0x80000000` and `0xFFFFFFFF`, which covers the padding and the sign bit.
- **Non-ASCII text.** The checksum is over UTF-8, not UTF-16 code units or code points:
  - `"é"` is `C3 A9` (2 bytes).
  - `"€"` is 3 bytes.
  - `"😀"` (a surrogate pair in JS) is 4 bytes, `F0 9F 98 80`.
  - Precomposed `"é"` and decomposed `"e\u0301"` therefore produce different checksums, because there is no
    Unicode normalisation.
- **Lone surrogates.** `TextEncoder` replaces every unpaired surrogate with U+FFFD (`EF BF BD`). As a result,
  `"\uD800"`, `"\uDFFF"` and `"\uFFFD"` all hash identically. Any faithful reimplementation must use the same
  WHATWG encoding, not a naive code-unit encoder.
- **NUL and control characters.** These are ordinary bytes. `"\0"` differs from `""`, and CRC-32 with a
  non-zero init is sensitive to leading zero bytes.
- **Byte-array input (outside the string contract).** Non-strings skip encoding:
  - `mystery(Uint8Array.of(0x61))` equals `mystery("a")`.
  - Plain arrays with values above 255 behave as if masked with `& 0xFF`, because only the low byte of
    `r ^ q[i]` is used.
  - A value without `length` (e.g. a number) runs zero iterations, giving `"00000000"`.
  - `null` or `undefined` throw.

  The reimplementation keeps this byte-level core as `crc32(bytes: Uint8Array)`, while `solution` follows the
  `(input: string) => string` contract.
- **Performance.** O(n) time with a 1 KiB table (a 256-entry `Uint32Array`). Megabyte-sized inputs are fine.

## The reimplementation (`solution.ts`)

- The parameters are named constants (`REFLECTED_POLYNOMIAL`, `INITIAL_REGISTER`, `FINAL_XOR`).
- The table is a `Uint32Array`, which stores unsigned values natively, so no `>>> 0` is needed on entries.
- `crc32(bytes)` is the byte-level checksum.
- `solution(input)` is `crc32(utf8.encode(input)).toString(16).padStart(8, "0")`.

## Evidence of equivalence

`equivalence.test.ts` (run with `npx tsx equivalence.test.ts`) compares `solution` with `mystery.mjs` on
**101,442 inputs with 0 mismatches**:

- known-answer vectors (they prove *correctness*, not just agreement);
- hand-picked edge cases, including megabyte-long strings;
- every single UTF-16 code unit (all 65,536, including every lone surrogate);
- a sweep of astral code points;
- 5,256 raw byte arrays;
- 20,200 seeded random strings over six alphabets;
- inputs with leading-zero checksums, plus forged extreme checksums.

Two deliberate mutants are both caught: uppercase hex, and init `0` instead of `0xFFFFFFFF`. The ground-truth
battery (`grader/grade.ts`, run but not read) reports `Result: EQUIVALENT` with 0 mismatches.
