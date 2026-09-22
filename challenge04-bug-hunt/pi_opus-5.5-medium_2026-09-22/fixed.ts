/**
 * A small "collections & numbers" toolkit (corrected version).
 *
 * Same public API as the original `toolkit.ts`; see `bugs.md` for the analysis
 * of every defect that was fixed. `clamp` and `dedupe` were already correct.
 */

/** True iff `year` is a leap year in the proleptic Gregorian calendar. */
export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
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
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  const lower = sorted[mid - 1]!;
  const upper = sorted[mid]!;
  const sum = lower + upper;
  // Halve before adding only when the sum would overflow to Infinity.
  return Number.isFinite(sum) ? sum / 2 : lower / 2 + upper / 2;
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
  // Work in exact integer thousandths: with at most 3 decimals and amount < 10000,
  // `amount * 1000` is within a tiny rounding error of an integer, so Math.round
  // recovers the exact decimal value (1.005 -> 1005, whereas 1.005 * 100 = 100.49999...).
  const thousandths = Math.round(amount * 1000);
  const cents = Math.floor((thousandths + 5) / 10);
  return cents / 100;
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
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    let group = Object.hasOwn(out, k) ? out[k] : undefined;
    if (group === undefined) {
      group = [];
      // defineProperty (not assignment) so a key such as "__proto__" becomes an
      // own data property instead of invoking the inherited prototype setter.
      Object.defineProperty(out, k, { value: group, writable: true, enumerable: true, configurable: true });
    }
    group.push(item);
  }
  return out;
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
  let next = 0;
  let failed = false;

  // A pool of `limit` workers, each pulling the next unclaimed index. A new call
  // starts as soon as any call finishes, and each call receives its true index.
  const worker = async (): Promise<void> => {
    while (!failed && next < items.length) {
      const index = next++;
      try {
        results[index] = await fn(items[index]!, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
