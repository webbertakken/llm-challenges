// Challenge 01 — Deep Readonly & Recursive Utility Types

// ─── DeepReadonly ──────────────────────────────────────────────────────────────

/**
 * Recursively makes every property in T readonly.
 * Handles primitives, arrays, tuples, Maps, Sets, and nested objects.
 *
 * Limitation: True circular references (type A = { self: A }) will cause
 * TypeScript to hit its recursion limit. In practice, most real-world types
 * are acyclic and work fine.
 */
export type DeepReadonly<T> =
  T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Map<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlySet<infer V> ? ReadonlySet<DeepReadonly<V>>
  : T extends Set<infer V> ? ReadonlySet<DeepReadonly<V>>
  : T extends readonly (infer _)[] ? DeepReadonlyArray<T>
  : T extends Function ? T
  : T extends object ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

// Preserve tuple structure by mapping over indices
type DeepReadonlyArray<T extends readonly unknown[]> =
  T extends readonly [] ? readonly []
  : T extends readonly [infer Head, ...infer Tail]
    ? readonly [DeepReadonly<Head>, ...DeepReadonlyArray<Tail>]
    : T extends readonly (infer U)[]
      ? readonly DeepReadonly<U>[]
      : never;

// ─── DeepMutable ───────────────────────────────────────────────────────────────

/**
 * Recursively strips readonly from every property in T.
 * The inverse of DeepReadonly.
 */
export type DeepMutable<T> =
  T extends ReadonlyMap<infer K, infer V> ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends Map<infer K, infer V> ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends ReadonlySet<infer V> ? Set<DeepMutable<V>>
  : T extends Set<infer V> ? Set<DeepMutable<V>>
  : T extends readonly (infer _)[] ? DeepMutableArray<T>
  : T extends Function ? T
  : T extends object ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

type DeepMutableArray<T extends readonly unknown[]> =
  T extends readonly [] ? []
  : T extends readonly [infer Head, ...infer Tail]
    ? [DeepMutable<Head>, ...DeepMutableArray<Tail>]
    : T extends readonly (infer U)[]
      ? DeepMutable<U>[]
      : never;

// ─── DeepPartial ───────────────────────────────────────────────────────────────

/**
 * Recursively makes every property optional.
 * Arrays remain arrays (not optional-element tuples).
 */
export type DeepPartial<T> =
  T extends Map<infer K, infer V> ? Map<K, DeepPartial<V>>
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, DeepPartial<V>>
  : T extends Set<infer V> ? Set<DeepPartial<V>>
  : T extends ReadonlySet<infer V> ? ReadonlySet<DeepPartial<V>>
  : T extends readonly (infer U)[] ? DeepPartial<U>[]
  : T extends Function ? T
  : T extends object ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// ─── DeepRequired ──────────────────────────────────────────────────────────────

/**
 * Recursively makes every property required.
 * The inverse of DeepPartial.
 */
export type DeepRequired<T> =
  T extends Map<infer K, infer V> ? Map<K, DeepRequired<V>>
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, DeepRequired<V>>
  : T extends Set<infer V> ? Set<DeepRequired<V>>
  : T extends ReadonlySet<infer V> ? ReadonlySet<DeepRequired<V>>
  : T extends readonly (infer U)[] ? DeepRequired<U>[]
  : T extends Function ? T
  : T extends object ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

// ─── DeepPick ──────────────────────────────────────────────────────────────────

/**
 * Pick deeply nested properties using dot-notation path strings.
 *
 * DeepPick<{ a: { b: { c: number; d: string }; e: boolean } }, "a.b.c" | "a.e">
 * => { a: { b: { c: number }; e: boolean } }
 */
export type DeepPick<T, Paths extends string> =
  T extends Function ? T
  : T extends object ? _DeepPick<T, Paths>
  : T;

// Split paths into top-level key and remaining sub-paths
type _DeepPick<T, Paths extends string> = {
  [K in keyof T as K extends TopLevelKeys<Paths> ? K : never]:
    // If K is a leaf path (appears exactly as a path with no dot), take the full value
    K extends Paths
      ? T[K]
      // Otherwise, recurse with the remaining sub-paths
      : K extends string
        ? DeepPick<T[K], ChildPaths<Paths, K>>
        : never;
};

// Extract top-level keys from dot-notation paths
type TopLevelKeys<Paths extends string> =
  Paths extends `${infer Key}.${string}` ? Key
  : Paths;

// Given a top-level key K, extract the remaining sub-paths
type ChildPaths<Paths extends string, K extends string> =
  Paths extends `${K}.${infer Rest}` ? Rest : never;
