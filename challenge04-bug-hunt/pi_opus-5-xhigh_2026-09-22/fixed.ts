/**
 * A small "collections & numbers" toolkit — corrected.
 *
 * Same public API as `toolkit.ts` (same names, signatures and return types);
 * only the behaviour that deviated from the documented contracts has changed.
 * `clamp` and `dedupe` were already correct and are left semantically intact.
 */

/** True iff `year` is a leap year in the proleptic Gregorian calendar. */
export function isLeapYear(year: number): boolean {
  // Every 4th year, except centuries, except every 400th year.
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

/** Clamp `x` into the inclusive range [lo, hi]. Caller guarantees lo <= hi. */
export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

/**
 * Split `arr` into consecutive chunks of length `size` (the last chunk may be
 * shorter). `size` is guaranteed to be a positive integer. The input is never
 * mutated.
 */
export function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    // `slice` takes an END index, not a length.
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * The median of `nums`. For odd length, the middle value. For even length, the
 * arithmetic mean of the two middle values. `nums` is non-empty and is never
 * mutated. Ordering is numeric.
 */
export function median(nums: readonly number[]): number {
  // Array#sort without a comparator sorts by UTF-16 string order.
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[mid]!;
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Remove duplicates, preserving the order of first occurrence. */
export function dedupe<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/**
 * Round a monetary `amount` to 2 decimal places using round-half-up
 * (so 1.005 -> 1.01, 2.675 -> 2.68). Returns a Number.
 *
 * `amount * 100` cannot be trusted: 1.005 is stored as 1.00499999999999989…,
 * so the product lands just below the .5 boundary and `Math.round` rounds the
 * wrong way. The contract guarantees at most 3 decimals, so we first recover
 * the exact number of thousandths (a small integer, comfortably exact) and
 * then do the half-up step in integer arithmetic.
 */
export function roundCurrency(amount: number): number {
  const thousandths = Math.round(amount * 1000);
  const hundredths = Math.floor(thousandths / 10);
  const remainder = thousandths - hundredths * 10; // always 0..9
  return (remainder >= 5 ? hundredths + 1 : hundredths) / 100;
}

/** All integers from `start` to `end`, inclusive of both ends (start <= end). */
export function rangeInclusive(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) {
    out.push(i);
  }
  return out;
}

/**
 * Group `items` by the string key produced by `key`. Returns a plain object
 * mapping each key to the list of items (in original order) that produced it.
 * The input is never mutated.
 *
 * Keys are arbitrary strings, including names that already exist on
 * `Object.prototype`. `out[k]` is therefore not a safe existence test
 * (`out["toString"]` is an inherited function), and `out[k] = []` is not a
 * safe write either (`out["__proto__"] = []` hits the prototype setter and
 * creates no own property at all). Hence: own-property test, and
 * `defineProperty` to write.
 */
export function groupBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    let bucket: T[];
    if (Object.prototype.hasOwnProperty.call(out, k)) {
      bucket = out[k]!;
    } else {
      bucket = [];
      Object.defineProperty(out, k, {
        value: bucket,
        enumerable: true,
        writable: true,
        configurable: true,
      });
    }
    bucket.push(item);
  }
  return out;
}

/**
 * Map over `items` with the async `fn`, running at most `limit` calls
 * concurrently. Resolves with results in the SAME order as `items`. If any
 * call rejects, the returned promise rejects. `limit` is a positive integer.
 *
 * A rolling pool of `limit` workers, each pulling the next index: the index
 * handed to `fn` is the item's position in `items`, and a slow item never
 * stalls the items behind it (which fixed-size batches did).
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;

  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index]!, index);
    }
  };

  const workers: Array<Promise<void>> = [];
  for (let i = 0; i < Math.min(limit, items.length); i += 1) {
    workers.push(worker());
  }
  await Promise.all(workers);
  return results;
}
