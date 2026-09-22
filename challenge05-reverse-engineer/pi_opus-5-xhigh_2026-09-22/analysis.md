# What `mystery.mjs` computes

## The one-line answer

It is **CRC-32**, in its standard reflected form — the checksum catalogued as
**CRC-32/ISO-HDLC** (the same one used by zip, gzip, PNG, Ethernet and `cksum -o 3`) — taken over
the **UTF-8 bytes** of the input string and rendered as **8 lowercase hex digits**.

`$("123456789")` returns `"cbf43926"`, which is the canonical CRC-32 *check* value. That single
output pins the variant.

## The exact variant

| Parameter | Value | Where it shows up in the source |
| --- | --- | --- |
| Width | 32 bits | `>>> 0` normalisation and the `0xFFFFFFFF` masks |
| Polynomial | `0x04C11DB7` | present only in **reflected** form, as `0xEDB88320` |
| Reflected in / out | `true` / `true` | the table shifts **right** (`c >>> 1`) and xors on the **low** bit |
| Init | `0xFFFFFFFF` | `let r = 0xFFFFFFFF` |
| XOR-out | `0xFFFFFFFF` | `r = (r ^ 0xFFFFFFFF) >>> 0` |
| Check (`"123456789"`) | `0xCBF43926` | verified against the module |
| Residue | `0xDEBB20E3` | (property of this variant, not used here) |
| Message bytes | UTF-8 | `new TextEncoder().encode(z)` |
| Output | lowercase hex, zero-padded to 8 | the `do…while` nibble loop plus the padding loop |

`0xEDB88320` is the bit-reversal of `0x04C11DB7`: it is the fingerprint of the reflected algorithm,
and is the single most identifying constant in the file.

## Stage by stage

### 1. `_t` — the byte lookup table (Sarwate's table-driven CRC)

```js
const _t = (() => { const a = []; let c, n, k;
  for (n = 0; n < 0x100; n++) { c = n;
    for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    a[n] = c >>> 0; }
  return a; })();
```

An IIFE run once at module load, building the classic 256-entry CRC table. Entry `n` is the
remainder of the single byte `n` after being clocked through the polynomial eight times.

The inner loop *is* polynomial long division in GF(2), written for a reflected register: the
register shifts towards the least significant bit, and whenever the bit shifted out is set
(`c & 1`), the reflected polynomial is subtracted — which, in GF(2), is an xor. `>>> 0` stores the
result as an unsigned 32-bit value, because JavaScript's bitwise operators otherwise yield signed
int32.

Building this table is only an optimisation: it replaces eight bit steps per input byte with one
xor and one lookup. It changes nothing about the result.

### 2. Input normalisation

```js
const q = (typeof z === "string") ? new TextEncoder().encode(z) : z;
```

A string is encoded to **UTF-8 bytes**; anything else is assumed to be a byte sequence already and
is used as-is. The declared surface is `(input: string) => string`, so the second branch is
effectively an undocumented convenience for `Uint8Array` input (the reimplementation keeps the
declared string signature and exports the byte-level `crc32` separately).

This line is where all the interesting edge-case behaviour lives: the checksum is over *bytes*, not
over UTF-16 code units, so anything non-ASCII contributes 2–4 bytes.

### 3. The update loop

```js
let r = 0xFFFFFFFF, i = -1;
while (++i < q.length) r = (r >>> 8) ^ _t[(r ^ q[i]) & 0xFF];
```

The obfuscation here is cosmetic: `i = -1` with pre-increment `++i` is just a `for` loop over the
bytes. The body is the textbook reflected table update — mix the next message byte into the low
end of the register, look up that byte's remainder, shift the register down by 8 and xor. The
register is seeded with all ones (`init = 0xFFFFFFFF`), which is what makes CRC-32 sensitive to
leading zero bytes.

### 4. Finalisation

```js
r = (r ^ 0xFFFFFFFF) >>> 0;
```

The final xor-out, i.e. a ones-complement of the register, then a cast back to unsigned. Without
it you would get the "raw" register value, and `""` would hash to `0xFFFFFFFF` instead of `0`.

### 5. Hex rendering

```js
let o = "", v = r;
do { o = "0123456789abcdef"[v & 15] + o; v >>>= 4; } while (v);
while (o.length < 8) o = "0" + o;
```

A hand-rolled `toString(16)`: take the low nibble, index it into the digit alphabet, prepend, shift
right by 4, repeat until the value is exhausted. Two details matter:

- It is a **do…while**, so a checksum of `0` still produces one digit (`"0"`) instead of the empty
  string.
- The trailing loop left-pads with `"0"` to a fixed width of 8. Since `r` is an unsigned 32-bit
  value, it never needs more than 8 nibbles, so the output is *always* exactly 8 lowercase hex
  characters.

Equivalent, in one line: `crc.toString(16).padStart(8, "0")`.

## Output format

Exactly 8 characters, `[0-9a-f]{8}`, most-significant nibble first (big-endian hex of the 32-bit
checksum). Never uppercase, never `0x`-prefixed, never shorter or longer.

## Edge cases

| Input | Output | Why |
| --- | --- | --- |
| `""` (empty) | `"00000000"` | The register stays at `0xFFFFFFFF`; the xor-out takes it to `0`, and the do…while + padding produce eight zeros rather than `""`. |
| `"a"` | `"e8b7be43"` | Single-byte check value for this variant. |
| `"123456789"` | `"cbf43926"` | The catalogue's check value — identifies the variant unambiguously. |
| `"\0"` and `"\0\0"` | differ | The all-ones init exists precisely so that leading/extra zero bytes change the result. |
| `"é"`, `"日本語"`, `"🙂"` | over 2/3/4 UTF-8 bytes each | The checksum is over UTF-8, so `"é"` (U+00E9) contributes `C3 A9`, not `E9`. |
| Astral characters (`U+10000`–`U+10FFFF`) | 4 bytes each | A surrogate **pair** is one code point and encodes as one 4-byte sequence, not as two 3-byte sequences. |
| Lone surrogates (`"\uD83D"`) | encoded as `EF BF BD` | `TextEncoder` substitutes U+FFFD for unpaired surrogates rather than throwing; the reimplementation inherits this by using `TextEncoder` too. |
| Combining marks, ZWJ sequences, BOM | byte-exact, no normalisation | Nothing is normalised: `"é"` (U+00E9) and `"e\u0301"` have different checksums. |
| Long inputs | no overflow | The register is kept unsigned 32-bit at each step (`>>>`), so there is no accumulation of sign or float error. |
| A checksum with leading zero nibbles | still 8 chars | The padding loop is the only reason the width is stable; e.g. any input whose CRC is `< 0x10000000`. |

Two non-cases worth stating: CRC-32 is **not** a cryptographic hash (collisions are trivial to
construct, and it is linear over GF(2)), and it is **not** the same as `zlib.crc32` output in
signed form — the `>>> 0` here means the value is always the unsigned one.

## The reimplementation

`solution.ts` re-derives the same function from the description above rather than renaming the
original: a named `REFLECTED_POLYNOMIAL`, a `buildCrcTable()` that spells out the reflected long
division, a `crc32(bytes: Uint8Array): number` core that any byte source can use, and a thin
`solution(input: string): string` that UTF-8-encodes and formats with
`toString(16).padStart(8, "0")`. The table is a `Uint32Array`, which is both faster and self-
documenting about the register width.

## Evidence of equivalence

`equivalence.test.ts` compares the two implementations over **5,086** inputs and reports zero
mismatches:

- the published CRC-32 check vectors (`""`, `"a"`, `"abc"`, `"message digest"`, `"123456789"`,
  the lowercase alphabet, the quick brown fox) asserted against their *known* values, not just
  against `mystery.mjs`, so a shared misunderstanding cannot hide;
- every code unit `0x00`–`0xFF` alone and doubled;
- multi-byte UTF-8, astral characters, ZWJ sequences, a BOM and `U+10FFFF`;
- lone and reversed surrogates;
- a length sweep (1 … 4096) across the hex-padding and buffer boundaries;
- inputs whose digests start with `00`, to exercise the zero-padding branch;
- 4,500 randomised strings from a seeded PRNG over three alphabets (ASCII, BMP, full Unicode).

The challenge's own battery agrees: `npx tsx grader/grade.ts pi_opus-5-xhigh_2026-09-22` reports
`Inputs tested: 5010`, `Mismatches: 0`, `Result: EQUIVALENT`.
