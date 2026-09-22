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
 * shorter). `size` is a positive integer. The input is never mutated.
 */
export function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

/**
 * Numeric median. Odd length → the middle value. Even length → the mean of
 * the two middle values. `nums` is non-empty and is never mutated.
 */
export function median(nums: readonly number[]): number {
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }
  return sorted[mid];
}

/** Remove duplicates, preserving the order of first occurrence. */
export function dedupe<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/**
 * Round a monetary `amount` to 2 decimal places, half up.
 * `0 <= amount < 10000`, with at most 3 decimal places.
 */
export function roundCurrency(amount: number): number {
  // Scale to the third decimal (exact enough to round for this domain), then
  // half-up into cents. Multiplying by 100 directly is not safe: 1.005 * 100
  // is 100.49999999999999, and Math.round drops it to 1.00.
  const millis = Math.round(amount * 1000);
  const cents = Math.floor(millis / 10) + (millis % 10 >= 5 ? 1 : 0);
  return cents / 100;
}

/** All integers from `start` to `end`, inclusive (`start <= end`). */
export function rangeInclusive(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) {
    out.push(i);
  }
  return out;
}

/**
 * Group `items` by `key(item)` into a plain object, preserving order.
 * Keys such as "toString" and "constructor" are own properties, not prototype lookups.
 */
export function groupBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Record<string, T[]> {
  const out: Record<string, T[]> = {};
  for (const item of items) {
    const groupKey = key(item);
    let bucket: T[] | undefined = Object.hasOwn(out, groupKey) ? out[groupKey] : undefined;
    if (bucket === undefined) {
      bucket = [];
      // defineProperty, not assignment: assignment to "__proto__" sets the prototype.
      Object.defineProperty(out, groupKey, {
        value: bucket,
        writable: true,
        enumerable: true,
        configurable: true,
      });
    }
    bucket.push(item);
  }
  return out;
}

/**
 * Map with at most `limit` calls in flight. Results stay in input order.
 * The index passed to `fn` is the item's position in `items`.
 * Rejects if any call rejects.
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
