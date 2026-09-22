/**
 * A small "collections & numbers" toolkit (corrected).
 *
 * Same public API as `toolkit.ts`; every function now honours its documented contract.
 * See `bugs.md` for the defect analysis.
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

/** Total numeric order (a plain `a - b` yields NaN for `Infinity - Infinity`). */
function compareNumbers(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * The median of `nums`. For odd length, the middle value. For even length, the
 * arithmetic mean of the two middle values. `nums` is non-empty and is never
 * mutated. Ordering is numeric.
 */
export function median(nums: readonly number[]): number {
  const sorted = nums.toSorted(compareNumbers);
  const mid = Math.floor(sorted.length / 2);
  const upper = sorted[mid]!;
  if (sorted.length % 2 === 1) return upper;
  const lower = sorted[mid - 1]!;
  // Halving each operand first is exact and cannot overflow to Infinity.
  return lower / 2 + upper / 2;
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
  // The contract allows at most 3 decimals, so the amount is an exact whole number of
  // thousandths; recover that integer first (absorbing binary representation error),
  // then round half up in exact integer arithmetic.
  const thousandths = Math.round(amount * 1000);
  const cents = Math.floor((thousandths + 5) / 10);
  return cents / 100;
}

/** All integers from `start` to `end`, inclusive of both ends (start <= end). */
export function rangeInclusive(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = Math.ceil(start); i <= end; i++) {
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
  // Group in a Map: its lookups never see inherited members such as `toString`.
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const k = key(item);
    const group = groups.get(k);
    if (group) group.push(item);
    else groups.set(k, [item]);
  }
  const out: Record<string, T[]> = {};
  for (const [k, group] of groups) {
    // defineProperty (not assignment) so "__proto__" becomes an own key instead of
    // invoking the inherited prototype setter.
    Object.defineProperty(out, k, { value: group, writable: true, enumerable: true, configurable: true });
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
  // One shared iterator: each worker pulls the next [index, item] pair as soon as it is free.
  const queue = items.entries();
  let failed = false;

  async function worker(): Promise<void> {
    for (const [index, item] of queue) {
      if (failed) return;
      try {
        results[index] = await fn(item, index);
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  }

  const workerCount = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: workerCount }, worker));
  return results;
}
