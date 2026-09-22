# What `mystery.mjs` computes

It is **CRC-32/ISO-HDLC** (the same parameters as PKZIP, Ethernet, PNG, and gzip), printed as **8 lowercase hexadecimal digits**.

The well-known check value matches: `solution("123456789") === "cbf43926"`. The empty string is `00000000`.

## Parameters

| Parameter | Value |
| --- | --- |
| Width | 32 |
| Polynomial | `0x04C11DB7` (normal form). The code uses the reflected form `0xEDB88320`. |
| Init | `0xFFFFFFFF` |
| Reflect in | yes (right-shift, LSB first) |
| Reflect out | yes (the shift is the reflection; there is no extra bit-reverse) |
| Xorout | `0xFFFFFFFF` |
| Residue / check | `0xCBF43926` on the ASCII bytes of `"123456789"` |
| Output | lowercase hex, zero-padded to 8 characters |

## What each stage of the obfuscated function does

1. **Table build (`_t`).** An IIFE fills a 256-entry table. For each byte `n`, it starts from `n` and, eight times, if the low bit is set, shifts right and xors `0xEDB88320`; otherwise it only shifts right. `>>> 0` forces an unsigned 32-bit value. That is the standard reflected CRC-32 lookup table.

2. **Bytes.** If the argument is a string, `new TextEncoder().encode(z)` turns it into UTF-8. Anything else is treated as an already-encoded byte sequence. The public contract is a string, so the clean reimplementation only accepts a string and encodes it the same way.

3. **Accumulate.** `r` starts at `0xFFFFFFFF`. For each byte `b`, `r = (r >>> 8) ^ table[(r ^ b) & 0xFF]`. The index uses only the low 8 bits of the running value, which is the reflected update.

4. **Final xor.** `r = (r ^ 0xFFFFFFFF) >>> 0` applies xorout and clears the sign bit so the result is a uint32.

5. **Format.** A do-while peels off nibbles (`v & 15`) into a lowercase hex string, least-significant nibble first (prepended). A second loop left-pads with `0` until the string is 8 characters. A 32-bit value never needs more than 8 digits, so the result is always exactly 8 hex characters. `0` becomes `"00000000"`, not `"0"`.

## Edge cases

- **Empty input.** The loop does not run. `0xFFFFFFFF ^ 0xFFFFFFFF` is `0`, formatted as `00000000`.
- **ASCII.** One byte per character, identical to hashing those raw bytes.
- **Non-ASCII / multi-byte.** Characters are not hashed as UTF-16 code units. `é` (U+00E9) is the two bytes `C3 A9`. `😀` (U+1F600) is the four-byte UTF-8 sequence. `"你好"` is six bytes.
- **Lone surrogates.** `TextEncoder` replaces an unpaired surrogate with U+FFFD (`EF BF BD`) rather than emitting the surrogate itself. The reimplementation calls `TextEncoder` too, so it follows that rule.
- **Embedded NULs and controls.** They are ordinary bytes (`0x00`, `0x0A`, …) and are included.
- **Non-string argument.** The obfuscated function would hash a byte array directly. That path is outside the string contract and is not part of `solution`.
