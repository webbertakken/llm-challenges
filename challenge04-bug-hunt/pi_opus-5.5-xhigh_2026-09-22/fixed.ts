/**
 * A small "collections & numbers" toolkit: corrected version.
 *
 * Same public API as `toolkit.ts` (names, signatures, return types). Every
 * defect is fixed; `clamp` and `dedupe` were already correct and are unchanged.
 * See `bugs.md` for the root cause and exposing input of each defect.
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

/** Mean of two numbers that cannot overflow: `(a + b) / 2` unless the sum leaves the finite range. */
function midpoint(a: number, b: number): number {
  const sum = a + b;
  return Number.isFinite(sum) ? sum / 2 : a / 2 + b / 2;
}

/**
 * The median of `nums`. For odd length, the middle value. For even length, the
 * arithmetic mean of the two middle values. `nums` is non-empty and is never
 * mutated. Ordering is numeric.
 */
export function median(nums: readonly number[]): number {
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid] ?? Number.NaN;
  if (sorted.length % 2 === 1) {
    return upper;
  }
  return midpoint(sorted[mid - 1] ?? Number.NaN, upper);
}

/** Remove duplicates, preserving the order of first occurrence. */
export function dedupe<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

/**
 * Round a monetary `amount` to 2 decimal places using round-half-up
 * (so 1.005 -> 1.01, 2.675 -> 2.68). Returns a Number.
 *
 * The contract bounds the input (0 <= amount < 10000, at most 3 decimals), so
 * `amount * 1000` lies within ~1e-9 of the intended integer number of
 * thousandths: rounding it recovers that integer exactly, and the half-up step
 * then happens in exact integer arithmetic instead of on a binary fraction.
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
 * Groups are collected in a `Map` (no inherited keys), then turned into a plain
 * object with `Object.fromEntries`, which defines own data properties, so keys
 * such as "toString", "constructor" and even "__proto__" become ordinary groups.
 */
export function groupBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Record<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = String(key(item));
    const group = groups.get(k);
    if (group) {
      group.push(item);
    } else {
      groups.set(k, [item]);
    }
  }
  return Object.fromEntries(groups);
}

/**
 * Map over `items` with the async `fn`, running at most `limit` calls
 * concurrently. Resolves with results in the SAME order as `items`. If any
 * call rejects, the returned promise rejects. `limit` is a positive integer.
 *
 * A pool of `limit` workers pulls `[index, item]` pairs from one shared
 * iterator, so each call receives its position in `items`, a slot frees up as
 * soon as any call settles, and no new call starts once one has failed.
 */
export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  const pending = items.entries();
  let failed = false;

  const worker = async (): Promise<void> => {
    for (const [index, item] of pending) {
      if (failed) return;
      try {
        results[index] = await fn(item, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
