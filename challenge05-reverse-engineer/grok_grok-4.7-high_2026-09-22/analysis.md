# What `mystery.mjs` computes

It is **CRC-32**, the reflected ISO-HDLC / IEEE 802.3 variant (also called PKZIP, PNG, and Ethernet CRC-32).

| Parameter | Value |
| --- | --- |
| Width | 32 bits |
| Polynomial | `0x04C11DB7` normal, `0xEDB88320` reflected |
| Init | `0xFFFFFFFF` |
| Reflect in | yes |
| Reflect out | yes (the loop uses the reflected table, so no extra reflection) |
| XorOut | `0xFFFFFFFF` |
| Check | CRC-32 of the ASCII bytes of `"123456789"` is `0xCBF43926` |

Output format: the final unsigned 32-bit word, written as **exactly 8 lowercase hex digits**, leading zeros included. The empty string hashes to `00000000`.

## Stages of the obfuscated function

1. **Table build (`_t`).** For each byte `0..255`, the low bit is tested eight times. If it is set, the value is shifted right and xored with `0xEDB88320`; otherwise it is only shifted. That constant is the bit-reversal of the CRC-32 polynomial, so the table is the standard reflected CRC-32 table. `>>> 0` forces an unsigned 32-bit result.

2. **Bytes, not code units.** If the argument is a string, `new TextEncoder().encode` turns it into UTF-8. The checksum is over those bytes. A non-string is used as a byte source directly; the required API only promises strings.

3. **Running CRC.** `r` starts at `0xFFFFFFFF`. For each byte `b`, `r = (r >>> 8) ^ table[(r ^ b) & 0xFF]`. That is the reflected update: the low byte of the register selects the table entry, and the register shifts right by 8.

4. **Final xor.** `r = (r ^ 0xFFFFFFFF) >>> 0` applies XorOut and clears the sign bit so the value is an unsigned 32-bit integer.

5. **Hex.** A do-while peels off 4-bit nibbles from the bottom, indexing `"0123456789abcdef"`, and prepends them. A second loop left-pads with `"0"` until the string is 8 characters. That is the same as `crc.toString(16).padStart(8, "0")`.

## Edge cases

- **Empty input.** The byte loop never runs. `0xFFFFFFFF ^ 0xFFFFFFFF` is 0, padded to `00000000`.
- **ASCII.** One UTF-8 byte per character, identical to hashing the raw bytes. `"123456789"` → `cbf43926`.
- **Non-ASCII.** Characters above U+007F contribute their UTF-8 sequence, not their UTF-16 code unit. `"é"` is the two bytes `C3 A9`, not `E9`. Emoji such as `"😀"` are four UTF-8 bytes. The checksum does not normalize NFC/NFD; it hashes the string’s code units as encoded.
- **U+0000.** A NUL inside the string is a real `00` byte and is included.
- **Lone surrogates.** `TextEncoder` follows the Encoding Standard and replaces an unpaired surrogate with U+FFFD (`EF BF BD`) before hashing. Both implementations share that encoder, so they agree.
- **Length.** There is no block size. Any string length, including one past the table size, is just more byte updates.
