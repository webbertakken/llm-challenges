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
  // Inputs have at most 3 decimal places, so the nearest thousandth is exact
  // enough to dodge binary error in `amount * 100`. Then round that last digit half up.
  const thousandths = Math.round(amount * 1000);
  const cents = Math.floor(thousandths / 10) + (thousandths % 10 >= 5 ? 1 : 0);
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
  const buckets = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const existing = buckets.get(k);
    if (existing) {
      existing.push(item);
    } else {
      buckets.set(k, [item]);
    }
  }
  return Object.fromEntries(buckets);
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
  const results: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const slice = items.slice(i, i + limit);
    const settled = await Promise.all(slice.map((item, offset) => fn(item, i + offset)));
    results.push(...settled);
  }
  return results;
}
