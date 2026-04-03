/**
 * Challenge 01 — Deep Readonly & Recursive Utility Types
 *
 * Circular references: TypeScript's structural type system handles recursive
 * type aliases lazily, so these types work with self-referential structures.
 * However, deeply nested circular types may hit the compiler's recursion limit
 * (~50 levels). This is a TypeScript limitation, not a bug in these definitions.
 */

// ─── DeepReadonly ──────────────────────────────────────────────────────────────

export type DeepReadonly<T> =
  T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>> :
  T extends ReadonlySet<infer U> ? ReadonlySet<DeepReadonly<U>> :
  T extends readonly any[]
    ? number extends T["length"]
      ? readonly DeepReadonly<T[number]>[]
      : Readonly<{ [K in keyof T]: DeepReadonly<T[K]> }>
    :
  T extends Function ? T :
  T extends object ? { readonly [P in keyof T]: DeepReadonly<T[P]> } :
  T;

// ─── DeepMutable ───────────────────────────────────────────────────────────────

export type DeepMutable<T> =
  T extends ReadonlyMap<infer K, infer V> ? Map<DeepMutable<K>, DeepMutable<V>> :
  T extends ReadonlySet<infer U> ? Set<DeepMutable<U>> :
  T extends readonly any[]
    ? number extends T["length"]
      ? DeepMutable<T[number]>[]
      : { -readonly [K in keyof T]: DeepMutable<T[K]> }
    :
  T extends Function ? T :
  T extends object ? { -readonly [P in keyof T]: DeepMutable<T[P]> } :
  T;

// ─── DeepPartial ───────────────────────────────────────────────────────────────

export type DeepPartial<T> =
  T extends Map<infer K, infer V> ? Map<K, DeepPartial<V>> :
  T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, DeepPartial<V>> :
  T extends Set<infer U> ? Set<U> :
  T extends ReadonlySet<infer U> ? ReadonlySet<U> :
  T extends (infer U)[] ? DeepPartial<U>[] :
  T extends readonly (infer U)[] ? readonly DeepPartial<U>[] :
  T extends Function ? T :
  T extends object ? { [P in keyof T]?: DeepPartial<T[P]> } :
  T;

// ─── DeepRequired ──────────────────────────────────────────────────────────────

export type DeepRequired<T> =
  T extends Map<infer K, infer V> ? Map<K, DeepRequired<V>> :
  T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, DeepRequired<V>> :
  T extends Set<infer U> ? Set<U> :
  T extends ReadonlySet<infer U> ? ReadonlySet<U> :
  T extends (infer U)[] ? DeepRequired<U>[] :
  T extends readonly (infer U)[] ? readonly DeepRequired<U>[] :
  T extends Function ? T :
  T extends object ? { [P in keyof T]-?: DeepRequired<T[P]> } :
  T;

// ─── DeepPick ──────────────────────────────────────────────────────────────────

/** Extract the first segment of each dot-separated path */
type HeadKeys<Paths extends string> =
  Paths extends `${infer Head}.${string}` ? Head : Paths;

/** Extract tail segments after stripping a given key prefix */
type TailPaths<Paths extends string, K extends string> =
  Paths extends `${K}.${infer Rest}` ? Rest : never;

/**
 * Pick deeply nested properties using dot-notation path strings.
 *
 * If a path matches a key exactly (no further dots), the entire value is kept.
 * If a path continues deeper, we recurse into the value type.
 */
export type DeepPick<T, Paths extends string> =
  T extends Function ? T :
  T extends object ? {
    [K in Extract<keyof T, HeadKeys<Paths>>]:
      K extends Paths
        ? T[K]
        : K extends string
          ? DeepPick<T[K], TailPaths<Paths, K>>
          : T[K]
  } : T;
