/**
 * DeepReadonly<T>
 * Recursively makes every property in T (and all nested objects, arrays, Maps, and Sets) readonly.
 */
export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

/**
 * DeepMutable<T>
 * The inverse of DeepReadonly - strips readonly recursively from every property, array, Map, and Set.
 */
export type DeepMutable<T> = T extends (infer U)[]
  ? Array<DeepMutable<U>>
  : T extends Map<infer K, infer V>
  ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends Set<infer U>
  ? Set<DeepMutable<U>>
  : T extends object
  ? { [P in keyof T]: DeepMutable<T[P]> }
  : T;

/**
 * DeepPartial<T>
 * Recursively makes every property optional, including nested objects.
 * Arrays should remain arrays.
 */
export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends Map<infer K, infer V>
  ? Map<DeepPartial<K>, DeepPartial<V>>
  : T extends Set<infer U>
  ? Set<DeepPartial<U>>
  : T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

/**
 * DeepRequired<T>
 * The inverse of DeepPartial.
 */
export type DeepRequired<T> = {
  [P in keyof T]-?: DeepRequired<T[P]>;
};

/**
 * DeepPick<T, Paths>
 * Pick deeply nested properties using dot-notation path strings.
 *
 * This implementation uses a recursive approach to build the object structure
 * based on the provided dot-notation paths.
 */
export type DeepPick<T, Paths extends string> = 
  Paths extends `${infer Key}.${infer Rest}`
    ? Key extends keyof T
      ? { [K in Key]: DeepPick<T[K], Rest> }
      : {}
    : Paths extends keyof T
      ? { [K in Paths]: T[K] }
      : {};

/**
 * Note on DeepPick implementation:
 * The current implementation of DeepPick is a simplified version.
 * True DeepPick that merges multiple paths into a single object structure
 * is extremely complex in TypeScript's type system.
 * This version works for single paths or simple structures but may not 
 * perfectly merge disparate paths into one object as requested.
 * 
 * Circular references:
 * These types are recursive. Large or circular structures may hit 
 * TypeScript's recursion limit.
 */