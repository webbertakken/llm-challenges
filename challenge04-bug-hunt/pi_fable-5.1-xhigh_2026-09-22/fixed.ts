/**
 * Corrected "collections & numbers" toolkit. Same public API as `toolkit.ts`;
 * see `bugs.md` for the defects that were fixed and why.
 */

/** True iff `year` is a leap year in the proleptic Gregorian calendar. */
export function isLeapYear(year: number): boolean {
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
  return sorted.length % 2 === 1 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

/** Remove duplicates, preserving the order of first occurrence. */
export function dedupe<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/**
 * Round a monetary `amount` to 2 decimal places using round-half-up
 * (so 1.005 -> 1.01, 2.675 -> 2.68). Returns a Number.
 *
 * `amount` has at most 3 decimals, so `amount * 1000` sits within a hair of an
 * integer number of thousandths; snapping to that integer first removes the
 * binary representation error before the half-up decision is made.
 */
export function roundCurrency(amount: number): number {
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
 *
 * Buckets are created as own properties so inherited names such as
 * `"toString"`, `"constructor"` or `"__proto__"` behave like any other key.
 */
export function groupBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const k = key(item);
    if (!Object.hasOwn(out, k)) {
      Object.defineProperty(out, k, { value: [], enumerable: true, writable: true, configurable: true });
    }
    out[k]!.push(item);
  }
  return out;
}

/**
 * Map over `items` with the async `fn`, running at most `limit` calls
 * concurrently. Resolves with results in the SAME order as `items`. If any
 * call rejects, the returned promise rejects. `limit` is a positive integer.
 *
 * Implemented as a pool of `limit` workers pulling from a shared cursor, so a
 * slow item never stalls the others and `fn` always receives the item's index
 * within `items`.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array<R>(items.length);
  let next = 0;
  let failed = false;

  const worker = async (): Promise<void> => {
    while (next < items.length && !failed) {
      const index = next++;
      try {
        results[index] = await fn(items[index]!, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
