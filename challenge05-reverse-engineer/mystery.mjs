/* eslint-disable */
// Behaviour-preserving, deliberately obscured. Figure out what it computes.
const _t = (() => { const a = []; let c, n, k; for (n = 0; n < 0x100; n++) { c = n; for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1); a[n] = c >>> 0; } return a; })();
export default function $(z) {
  const q = (typeof z === "string") ? new TextEncoder().encode(z) : z;
  let r = 0xFFFFFFFF, i = -1;
  while (++i < q.length) r = (r >>> 8) ^ _t[(r ^ q[i]) & 0xFF];
  r = (r ^ 0xFFFFFFFF) >>> 0;
  let o = "", v = r;
  do { o = "0123456789abcdef"[v & 15] + o; v >>>= 4; } while (v);
  while (o.length < 8) o = "0" + o;
  return o;
}
