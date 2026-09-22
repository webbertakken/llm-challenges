# Analysis — what `mystery.mjs` computes

## The answer in one line

It is **CRC-32**, the IEEE 802.3 / ISO-HDLC variant (the one used by zip, gzip, PNG and
`cksum -o 3`), computed over the **UTF-8 bytes** of the input string and returned as a
**lowercase hexadecimal string, zero-padded to eight digits**.

Catalogue name: **CRC-32/ISO-HDLC** (aliases: CRC-32, CRC-32/ADCCP, PKZIP).

| Parameter | Value |
| --- | --- |
| Width | 32 bits |
| Polynomial | `0x04C11DB7` (normal form), used here as `0xEDB88320` (reflected form) |
| Init | `0xFFFFFFFF` |
| Input reflected (`refin`) | yes |
| Output reflected (`refout`) | yes |
| Final XOR (`xorout`) | `0xFFFFFFFF` |
| Check value (`"123456789"`) | `0xCBF43926` → `"cbf43926"` |
| Residue | `0xDEBB20E3` |

The reflected implementation style — table built by shifting *right*, register fed with
`(r ^ byte) & 0xFF` at the *bottom* — is exactly what `refin = refout = true` looks like in code,
so no explicit bit-reversal appears anywhere.

## Stage by stage through the obfuscated source

### 1. `_t` — the byte-at-a-time lookup table

```js
const _t = (() => { const a = []; let c, n, k;
  for (n = 0; n < 0x100; n++) { c = n;
    for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    a[n] = c >>> 0; } return a; })();
```

An IIFE that builds the classic 256-entry CRC table at module load. For each byte value `n` it
performs eight steps of polynomial division in `GF(2)`: shift the register right by one; if the bit
that fell off was set, XOR in the reflected polynomial `0xEDB88320`. The magic constant is the
bit-reversal of the standard CRC-32 polynomial `0x04C11DB7`, which is the tell that this is the
reflected formulation rather than a different polynomial. `c >>> 0` normalises the signed result of
`^` into an unsigned 32-bit value. Entry `n` is "the CRC register contents after absorbing byte `n`
into an empty register", which is what lets the main loop process a whole byte per iteration
instead of eight single-bit steps.

### 2. Input normalisation

```js
const q = (typeof z === "string") ? new TextEncoder().encode(z) : z;
```

A string is encoded to **UTF-8** bytes via `TextEncoder` (the challenge states the function is
`(input: string) => string`, so this branch always fires). Anything else is assumed to already be a
byte-indexable sequence. This matters: the digest is over bytes, not UTF-16 code units, so `"é"`
contributes two bytes and `"🙂"` four.

### 3. The CRC loop

```js
let r = 0xFFFFFFFF, i = -1;
while (++i < q.length) r = (r >>> 8) ^ _t[(r ^ q[i]) & 0xFF];
```

`r` is the running register, pre-set to the `init` value `0xFFFFFFFF` (equivalent to complementing
a zero register, which is what makes CRC-32 sensitive to leading zero bytes). The pre-increment
`++i` in the condition starting from `-1` is just an obfuscated `for (i = 0; i < q.length; i++)`.
The body is the standard reflected table step: the low byte of the register is mixed with the next
input byte to index the table, the register is shifted down by eight bits, and the table entry is
XORed in.

### 4. Finalisation

```js
r = (r ^ 0xFFFFFFFF) >>> 0;
```

The `xorout` step — complement the register — followed by `>>> 0` to reinterpret the result as an
unsigned 32-bit integer (JavaScript's bitwise operators produce signed int32, so without this a
CRC with the top bit set would come out negative).

### 5. Output encoding

```js
let o = "", v = r;
do { o = "0123456789abcdef"[v & 15] + o; v >>>= 4; } while (v);
while (o.length < 8) o = "0" + o;
return o;
```

A hand-rolled `Number.prototype.toString(16)`: repeatedly take the low nibble, map it through a
lowercase hex alphabet and prepend, shifting right by four. The `do…while` guarantees at least one
digit, so the value `0` yields `"0"` rather than the empty string, and the trailing loop
left-pads with zeros to a fixed width of 8. Because `r < 2^32`, the result is always exactly eight
lowercase hex digits — never more, never fewer.

## Output format

Exactly `/^[0-9a-f]{8}$/`: big-endian hex of the 32-bit CRC, lowercase, zero-padded. Empty input
gives `"00000000"` (init `0xFFFFFFFF` XOR final `0xFFFFFFFF` = 0).

## Edge cases

- **Empty string** → `"00000000"`. Handled naturally: the loop body never runs, and the `do…while`
  in the encoder still emits a digit before padding.
- **Leading NUL bytes** are *not* invisible. That is the purpose of `init = 0xFFFFFFFF`: a plain
  zero-initialised register would give the same CRC for `"\0abc"` and `"abc"`.
- **Non-ASCII / multi-byte characters.** The digest is over UTF-8 bytes, so `"é"` (U+00E9) is
  `C3 A9`, `"日"` is three bytes, `"🙂"` is four bytes fed from a surrogate pair. Two strings that
  differ only in normalisation form (`"é"` as U+00E9 vs `"e" + U+0301`) produce different digests —
  the function does no Unicode normalisation.
- **Lone surrogates.** `TextEncoder` replaces an unpaired surrogate with U+FFFD (`EF BF BD`), so
  `"\uD800"` and `"\uFFFD"` hash identically. The reimplementation uses `TextEncoder` too, so it
  inherits exactly the same substitution behaviour rather than trying to re-derive it.
- **Sign and width.** Without `>>> 0`, `r ^ 0xFFFFFFFF` can be negative; the obfuscated code and the
  reimplementation both normalise before formatting, so no `"-1a2b…"` output is possible.
- **Long inputs.** The algorithm is a single pass with no allocation beyond the UTF-8 buffer; the
  harness covers inputs up to ~5000 characters, and there is no length-dependent branch.
- **Not a hash function.** CRC-32 is an error-detection code, linear over GF(2) and trivially
  invertible. Equivalent output means equivalent behaviour, not cryptographic strength — worth
  stating because the output *looks* like a short hash digest.

## Reimplementation and proof of equivalence

`solution.ts` re-expresses the algorithm from the parameters above: a named reflected polynomial
constant, a table builder whose loop reads as polynomial division, a `crc32(bytes)` core that hands
back an unsigned 32-bit number, and a thin `solution(input)` that encodes UTF-8 and formats with
`toString(16).padStart(8, "0")`. Nothing is copied from the obfuscated source.

`equivalence.test.ts` compares the two implementations over:

1. published CRC-32/ISO-HDLC check vectors (`""`, `"a"`, `"123456789"`, the pangram), which pin the
   *variant* rather than merely agreeing with the obfuscated code;
2. hand-picked edge cases: empty, NULs, control characters, every UTF-8 width boundary, BOM, astral
   plane, ZWJ sequences, lone surrogates, 4096-character runs;
3. every single-byte code point plus a sweep of the BMP;
4. ~1240 randomised strings across three alphabets and two length regimes, from a seeded PRNG so a
   failure is reproducible;
5. an output-format assertion (`/^[0-9a-f]{8}$/`).

Results: `2397/2397 checks passed — Result: EQUIVALENT`, and the ground-truth grader reports
`Inputs tested: 5010, Mismatches: 0`.
