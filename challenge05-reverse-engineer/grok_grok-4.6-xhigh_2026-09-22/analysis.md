# Mystery function — analysis

## Algorithm

**CRC-32/ISO-HDLC**, also catalogued as CRC-32, CRC-32/ADCCP, CRC-32/V-42, CRC-32/XZ, and the PKZIP / PNG / Ethernet checksum.

Exact parameters (Rocksoft / CRC RevEng notation):

| Parameter | Value |
| --- | --- |
| width | 32 |
| poly | `0x04C11DB7` (normal form); reflected table constant `0xEDB88320` |
| init | `0xFFFFFFFF` |
| refin | true (LSB-first / reflected input) |
| refout | true (reflected register; implied by the reflected table) |
| xorout | `0xFFFFFFFF` |
| check | `0xCBF43926` on the ASCII string `123456789` |

Output encoding: **8-character lowercase hexadecimal**, zero-padded on the left. Not Base64, not uppercase, not `0x`-prefixed.

## How the obfuscated stages map

1. **`_t` IIFE** — Builds the 256-entry reflected CRC-32 table. For each seed `n ∈ [0, 255]`, eight times: if the LSB is set, XOR `0xEDB88320` after a one-bit right shift, otherwise just shift. `>>> 0` keeps entries as uint32. That constant is the bit-reversal of the IEEE polynomial `0x04C11DB7`.

2. **Input coercion** — `typeof z === "string" ? new TextEncoder().encode(z) : z`. Strings are hashed as **UTF-8 bytes**. The public contract of this challenge is `(input: string) => string`; the byte-array branch is unused by that API but shows the algorithm is defined on an octet string.

3. **Register walk** — `r = 0xFFFFFFFF`, then for each byte `r = (r >>> 8) ^ table[(r ^ byte) & 0xFF]`. Classic table-driven reflected CRC: mix the next octet into the low byte of the register, replace the register with `table[that] XOR (register shifted down one byte)`.

4. **Final XOR** — `r = (r ^ 0xFFFFFFFF) >>> 0`. Complement and canonicalise to uint32. Combined with the all-ones init, the empty input yields `0`.

5. **Hex emission** — A `do/while` peels least-significant nibbles and **prepends** them, so the string is most-significant-nibble first. A second loop left-pads with `'0'` to width 8. Equivalent to `value.toString(16).padStart(8, "0")`.

## Edge cases

| Input | Behaviour |
| --- | --- |
| `""` | No bytes processed; init XOR xorout → `00000000` |
| ASCII | One table lookup per character (UTF-8 is a single byte) |
| Non-ASCII / supplementary-plane | `TextEncoder` emits UTF-8 (e.g. `©` is `C2 A9`; `🚀` is four bytes `F0 9F 9A 80`). CRC runs on those octets, not on UTF-16 code units |
| NULs | `"\0"` is a one-byte `0x00` message; valid and non-empty |
| Long strings | Purely iterative; no length encoded in the digest |

The reimplementation in `solution.ts` names these parameters, uses a clearly documented table, and formats with `toString(16).padStart(8, "0")` rather than the nibble loop.
