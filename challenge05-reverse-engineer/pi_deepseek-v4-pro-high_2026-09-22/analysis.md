# Reverse engineering analysis — `mystery.mjs`

## What it computes

`mystery.mjs` computes the **CRC-32** cyclic redundancy check (the **IEEE
802.3 / Ethernet / zlib variant**) of the **UTF-8 encoding** of its input
string, and returns it as an **8-digit lowercase hexadecimal string, zero
padded on the left**.

- **Polynomial:** `0xEDB88320` (the standard *reflected* polynomial).
- **Init value:** `0xFFFFFFFF`.
- **Processing:** reflected (LSB-first), byte-at-a-time, using a 256-entry
  lookup table.
- **Final transform:** XOR with `0xFFFFFFFF` (the "final XOR" step).
- **Output encoding:** lowercase hex, exactly 8 digits (`padStart(8, "0")`).

The classic check value confirms the identification: the CRC-32 of
`"123456789"` is `0xCBF43926`, and this function returns `"cbf43926"`.

## Stage-by-stage description of the obfuscated code

```js
const _t = (() => {
  const a = [];
  let c, n, k;
  for (n = 0; n < 0x100; n++) {          // for each of the 256 table entries
    c = n;
    for (k = 0; k < 8; k++)              // 8 bits per byte
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      // reflect one bit: if LSB set, xor the reflected polynomial after shifting
    a[n] = c >>> 0;                      // normalise to uint32
  }
  return a;
})();
```

1. **Table build (`_t`):** an IIFE precomputes the 256-entry CRC-32 lookup
   table. For each byte value `n`, it runs the standard "reflect and fold one
   bit" update 8 times, xoring the reflected polynomial `0xEDB88320` whenever
   the least-significant bit is set, then stores the result as an unsigned
   32-bit integer. This runs once, lazily, when the module loads.

2. **Input normalisation (`q`):** `typeof z === "string"` selects
   `new TextEncoder().encode(z)`, so strings are converted to their UTF-8
   bytes. (The fallback branch accepts a `Uint8Array` directly, but the public
   contract is `(input: string) => string`.)

3. **Folding loop:** `r` starts at `0xFFFFFFFF`; for each byte the register is
   shifted right 8 bits and xored with `_t[(r ^ byte) & 0xFF]`, the table entry
   indexed by the low byte of `r ^ byte`. This is the standard reflected CRC
   update step.

4. **Final transform:** `r = (r ^ 0xFFFFFFFF) >>> 0` applies the final XOR and
   normalises to a uint32.

5. **Rendering:** the result is emitted as lowercase hex, nibble by nibble
   from least to most significant, then left-padded with `"0"` until it is 8
   characters long.

## Edge cases

- **Empty input:** the register never updates, so the result is
  `(0xFFFFFFFF ^ 0xFFFFFFFF) = 0`, rendered as `"00000000"`.
- **Non-ASCII / multi-byte input:** the input is UTF-8 encoded first, so
  `"é"`, CJK text and emoji each contribute their full UTF-8 byte sequence to
  the checksum. This matches the reference because both sides use
  `TextEncoder`.
- **Bytes ≥ 0x80:** handled correctly via the `& 0xFF` mask and the unsigned
  `>>>` shifts; no sign-extension leaks into the table index.
- **Leading zeros:** values whose checksum is below `0x10000000` (e.g. `0`
  itself) are zero-padded to exactly 8 characters, so the output is always
  length 8.

## Reimplementation note

`solution.ts` rebuilds the same lookup table and fold, but names the intent
(polynomial, init, final XOR) and uses `TextEncoder`/`padStart` directly. The
equivalence harness confirms byte-for-byte identical output over edge cases
and 2200 deterministic randomised inputs.
