# Analysis

The mystery function computes the standard reflected CRC-32 checksum, also known as CRC-32/ISO-HDLC, CRC-32/ADCCP, or the common ZIP/PNG/Ethernet CRC-32 variant.

Exact parameters:

- Width: 32 bits
- Polynomial: `0x04C11DB7`, implemented in reflected form as `0xEDB88320`
- Initial value: `0xFFFFFFFF`
- Input reflection: yes, because bytes are processed least-significant bit first through the reflected table
- Output reflection: yes, inherent to the reflected implementation
- Final XOR: `0xFFFFFFFF`
- Check value for ASCII `"123456789"`: `cbf43926`
- Output format: lowercase hexadecimal, left-padded to exactly 8 characters

The first top-level expression builds a 256-entry lookup table. For each possible byte value, it shifts the current remainder right eight times. When the low bit is set, it XORs with the reflected CRC-32 polynomial `0xEDB88320`; otherwise it only shifts. Each table entry is forced to an unsigned 32-bit integer with `>>> 0`.

The exported function first converts string input to bytes with `TextEncoder`, so the checksum is over UTF-8 bytes, not JavaScript UTF-16 code units. It initializes the CRC remainder to `0xFFFFFFFF`, then for each byte updates the remainder with:

```ts
remainder = (remainder >>> 8) ^ table[(remainder ^ byte) & 0xff]
```

After all bytes are processed, it applies the final XOR with `0xFFFFFFFF` and coerces the result to an unsigned 32-bit value. The final loop manually converts that unsigned value to hexadecimal by repeatedly prepending the low nibble's lowercase digit, then pads with leading zeroes until the string is 8 characters long.

Edge cases:

- Empty input hashes the empty byte sequence and returns `00000000`.
- ASCII input is hashed byte-for-byte as usual.
- Non-ASCII input is encoded as UTF-8 first, so characters such as `é`, CJK text, and emoji contribute their multi-byte UTF-8 encodings.
- Lone UTF-16 surrogate code units are handled the same way as the mystery function because both use `TextEncoder`, which encodes JavaScript strings as UTF-8 after Web IDL USVString conversion.
