# Analysis of `mystery.mjs`

## Algorithm

**CRC-32/ISO-HDLC**, the common 32-bit cyclic redundancy check also catalogued as CRC-32/IEEE, CRC-32/PKZIP, CRC-32/ADCCP, CRC-32/V-42, and Ethernet FCS.

Exact parameters (Rocksoft / Catalogue of parametrised CRC algorithms):

| Parameter | Value |
| --- | --- |
| Width | 32 |
| Polynomial (normal) | `0x04C11DB7` |
| Polynomial (reflected, as used) | `0xEDB88320` |
| Init | `0xFFFFFFFF` |
| RefIn | true (LSB-first / reflected table) |
| RefOut | true (implied by the reflected implementation) |
| XorOut | `0xFFFFFFFF` |
| Check (`"123456789"`) | `0xCBF43926` |
| Residue / empty message | `0x00000000` |

Output encoding: **8-digit lowercase hexadecimal**, zero-padded on the left. No `0x` prefix.

## What each stage of the obfuscated code does

1. **`_t` IIFE** — Builds the 256-entry reflected CRC table. For each byte `n`, it shifts right 8 times; whenever the bit shifted out is 1 it XORs in `0xEDB88320`. That constant is the bit-reversal of the IEEE polynomial `0x04C11DB7`. Entries are forced to uint32 via `>>> 0`.

2. **Input coercion** — `typeof z === "string" ? new TextEncoder().encode(z) : z`. Strings are hashed as **UTF-8 bytes**. A non-string (e.g. `Uint8Array`) is treated as a raw byte sequence. The public contract of this challenge is `(string) => string`, so the clean reimplementation only accepts a string and always UTF-8-encodes it.

3. **Core loop** — `r` starts at `0xFFFFFFFF`. Each byte is mixed in with the reflected Sarwate step:
   `r = (r >>> 8) ^ table[(r ^ byte) & 0xFF]`.
   That is “XOR the incoming byte into the low 8 bits of the register, replace those bits from the table, shift the register right by one byte.”

4. **Final XOR** — `r = (r ^ 0xFFFFFFFF) >>> 0`. Combined with the all-ones init, this is the standard CRC-32 post-conditioning (equivalent to complementing the register). The `>>> 0` canonicalises the result as an unsigned 32-bit integer.

5. **Hex rendering** — Nibbles are peeled from the low end (`v & 15`) and **prepended**, which emits most-significant-nibble first. A `do/while` guarantees at least one digit (so a zero CRC becomes `"0"` before padding). Leading `"0"` characters are then added until the string is 8 characters. A uint32 never needs more than 8 hex digits, so the result is always length 8.

## Edge cases

- **Empty string.** No bytes enter the loop, so `0xFFFFFFFF ^ 0xFFFFFFFF = 0` → `"00000000"`.
- **Non-ASCII / multi-byte.** `TextEncoder` emits UTF-8. `"é"` is `C3 A9`; `"😀"` is `F0 9F 98 80`. CRC is over those bytes, not UTF-16 code units.
- **NUL.** `"\0"` is a single `0x00` byte, not skipped.
- **Length.** Any string length is valid; the algorithm is streaming and O(n).
- **Case of hex.** Digits `a–f` are lowercase, matching `"0123456789abcdef"`.
