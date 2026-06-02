/**
 * DeepReadonly<T>
 * Recursively makes every property in T (and all nested objects, arrays, Maps, and Sets) readonly.
 */
export type DeepReadonly<T> = T extends (...args: any[]) => any
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlySet<infer V>
  ? ReadonlySet<DeepReadonly<V>>
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * DeepMutable<T>
 * Strips readonly recursively from every property, array, Map, and Set.
 */
export type DeepMutable<T> = T extends (...args: any[]) => any
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends ReadonlySet<infer V>
  ? Set<DeepMutable<V>>
  : T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

/**
 * DeepPartial<T>
 * Recursively makes every property optional, including nested objects.
 */
export type DeepPartial<T> = T extends (...args: any[]) => any
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? Map<DeepPartial<K>, DeepPartial<V>>
  : T extends ReadonlySet<infer V>
  ? Set<DeepPartial<V>>
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/**
 * DeepRequired<T>
 * Recursively makes every property required.
 */
export type DeepRequired<T> = T extends (...args: any[]) => any
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? Map<DeepRequired<K>, DeepRequired<V>>
  : T extends ReadonlySet<infer V>
  ? Set<DeepRequired<V>>
  : T extends object
  ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

/**
 * Helper: UnionToIntersection
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

/**
 * Helper: Simplify/Flatten intersections
 */
type Simplify<T> = T extends object
  ? T extends Map<any, any> | Set<any>
    ? T
    : { [K in keyof T]: Simplify<T[K]> }
  : T;

/**
 * DeepPick<T, Paths>
 * Pick deeply nested properties using dot-notation path strings.
 */
export type DeepPick<T, Paths extends string> = Simplify<
  UnionToIntersection<
    Paths extends `${infer Key}.${infer Rest}`
      ? Key extends keyof T
        ? { [P in Key]: DeepPick<T[P], Rest> }
        : never
      : Paths extends keyof T
      ? { [P in Paths]: T[Paths] }
      : never
  >
>;
