/**
 * Reference correct implementation for challenge 04.
 *
 * This is the ground truth used by the grader. Do NOT read this file while
 * solving the challenge.
 */

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function clamp(x: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, x));
}

export function chunk<T>(arr: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    out.push(arr.slice(i, i + size));
  }
  return out;
}

export function median(nums: readonly number[]): number {
  const sorted = nums.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid]!;
  }
  return (sorted[mid - 1]! + sorted[mid]!) / 2;
}

export function dedupe<T>(items: readonly T[]): T[] {
  return [...new Set(items)];
}

export function roundCurrency(amount: number): number {
  // Nudge past the floating-point representation error before rounding.
  // Contract restricts amounts to [0, 10000) with <= 3 decimals, where a
  // 1e-9 nudge is far larger than the representation gap yet far smaller than
  // a genuine half-cent.
  return Math.round(amount * 100 + 1e-9) / 100;
}

export function rangeInclusive(start: number, end: number): number[] {
  const out: number[] = [];
  for (let i = start; i <= end; i++) {
    out.push(i);
  }
  return out;
}

export function groupBy<T>(
  items: readonly T[],
  key: (item: T) => string,
): Record<string, T[]> {
  // Null-prototype object so keys like "toString"/"constructor" can't collide
  // with inherited members.
  const out: Record<string, T[]> = Object.create(null);
  for (const item of items) {
    const k = key(item);
    (out[k] ??= []).push(item);
  }
  return out;
}

export async function mapLimit<T, R>(
  items: readonly T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  const worker = async (): Promise<void> => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]!, index);
    }
  };
  const pool = Math.min(limit, items.length);
  await Promise.all(Array.from({ length: pool }, () => worker()));
  return results;
}
