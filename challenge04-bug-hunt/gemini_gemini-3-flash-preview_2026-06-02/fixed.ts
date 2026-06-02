/**
 * A small "collections & numbers" toolkit.
 *
 * Each exported function has a precise contract documented in the challenge
 * README. Some functions are correct. Others contain exactly one subtle defect
 * that makes them deviate from their documented contract on certain inputs.
 *
 * Your job is to find the defects, explain them, and ship a corrected version
 * with the SAME public API (same names, same signatures, same return types).
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
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1]! + sorted[mid]!) / 2;
  }
  return sorted[mid]!;
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
  // Using a small epsilon to handle floating point precision issues for half-up rounding
  return Math.round((amount + 1e-9) * 100) / 100;
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
  const out: Record<string, T[]> = Object.create(null);
  for (const item of items) {
    const k = key(item);
    if (!out[k]) {
      out[k] = [];
    }
    out[k].push(item);
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
  const results: R[] = new Array(items.length);
  let nextIndex = 0;
  let activeCount = 0;
  let rejected = false;
  let rejectionError: any = null;

  return new Promise<R[]>((resolve, reject) => {
    if (items.length === 0) {
      resolve([]);
      return;
    }

    const runNext = () => {
      if (rejected) return;
      if (nextIndex === items.length && activeCount === 0) {
        resolve(results);
        return;
      }

      while (activeCount < limit && nextIndex < items.length && !rejected) {
        const i = nextIndex++;
        activeCount++;
        fn(items[i]!, i)
          .then((res) => {
            results[i] = res;
            activeCount--;
            runNext();
          })
          .catch((err) => {
            if (!rejected) {
              rejected = true;
              rejectionError = err;
              reject(err);
            }
          });
      }
    };

    runNext();
  });
}
