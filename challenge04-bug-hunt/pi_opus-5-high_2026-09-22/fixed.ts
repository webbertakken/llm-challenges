/**
 * A small "collections & numbers" toolkit — corrected.
 *
 * Same public API as `toolkit.ts` (same names, signatures and return types).
 * See `bugs.md` for the defect analysis; the comments below only flag the
 * non-obvious parts of each fix.
 */

/** True iff `year` is a leap year in the proleptic Gregorian calendar. */
export function isLeapYear(year: number): boolean {
  // Centuries are ordinary years unless they are also divisible by 400.
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
 */
export function roundCurrency(amount: number): number {
  // The input carries at most 3 decimals, so scaling by 1000 and rounding
  // recovers the exact decimal the caller meant, undoing the binary
  // representation error (1.005 * 100 is 100.49999999999999).
  const thousandths = Math.round(amount * 1000);
  // Half-up on the recovered integer: add 5 thousandths, then truncate.
  return Math.floor((thousandths + 5) / 10) / 100;
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
 */
export function groupBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Record<string, T[]> {
  // A Map has no prototype keys to collide with, so "toString", "constructor"
  // and "__proto__" behave like any other key. `Object.fromEntries` then
  // *defines* own properties (rather than assigning them), which keeps
  // "__proto__" a real entry instead of re-pointing the prototype.
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const bucket = groups.get(k);
    if (bucket) bucket.push(item);
    else groups.set(k, [item]);
  }
  return Object.fromEntries(groups);
}

/**
 * Map over `items` with the async `fn`, running at most `limit` calls
 * concurrently. Resolves with results in the SAME order as `items`. If any
 * call rejects, the returned promise rejects. `limit` is a positive integer.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let nextIndex = 0;

  // A pool of `limit` workers pulling from a shared cursor: a slow item never
  // stalls the whole batch, and every call sees its absolute index.
  const workerCount = Math.min(limit, items.length);
  const workers: Promise<void>[] = [];
  for (let w = 0; w < workerCount; w++) {
    workers.push(
      (async () => {
        while (nextIndex < items.length) {
          const index = nextIndex++;
          results[index] = await fn(items[index]!, index);
        }
      })(),
    );
  }

  // Promise.all attaches a handler to every worker, so a rejection propagates
  // once and the remaining workers cannot raise an unhandled rejection.
  await Promise.all(workers);
  return results;
}
