/**
 * Recursive utility types for arbitrarily nested structures.
 * 
 * Limitations regarding circular references:
 * TypeScript evaluates mapped types lazily when properties are accessed. For recursive
 * structures (e.g. `type Node = { next: Node }`), simple property accesses work.
 * However, unbounded recursion or eager evaluation across recursive cycles can trigger
 * TS2589: "Type instantiation is excessively deep and possibly infinite."
 */

export type Builtin =
  | Function
  | Date
  | RegExp
  | Error
  | number
  | string
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

/**
 * Recursively makes every property in T (and all nested objects, arrays, Maps, and Sets) readonly.
 */
export type DeepReadonly<T> =
  T extends Builtin
    ? T
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
        : T extends Set<infer V>
          ? ReadonlySet<DeepReadonly<V>>
          : T extends ReadonlySet<infer V>
            ? ReadonlySet<DeepReadonly<V>>
            : T extends readonly any[]
              ? number extends T['length']
                ? readonly DeepReadonly<T[number]>[]
                : { readonly [K in keyof T]: DeepReadonly<T[K]> }
              : T extends object
                ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
                : T;

/**
 * The inverse of DeepReadonly — strips readonly recursively from every property, array, Map, and Set.
 */
export type DeepMutable<T> =
  T extends Builtin
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlySet<infer V>
        ? Set<DeepMutable<V>>
        : T extends readonly any[]
          ? number extends T['length']
            ? DeepMutable<T[number]>[]
            : { -readonly [K in keyof T]: DeepMutable<T[K]> }
          : T extends object
            ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
            : T;

/**
 * Recursively makes every property optional, including nested objects.
 * Arrays remain arrays (not turned into optional-element tuples).
 * Tuples remain tuples with optional elements.
 */
export type DeepPartial<T> =
  T extends Builtin
    ? T
    : T extends Map<infer K, infer V>
      ? Map<DeepPartial<K>, DeepPartial<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
        : T extends Set<infer V>
          ? Set<DeepPartial<V>>
          : T extends ReadonlySet<infer V>
            ? ReadonlySet<DeepPartial<V>>
            : T extends readonly any[]
              ? number extends T['length']
                ? T extends any[]
                  ? DeepPartial<T[number]>[]
                  : readonly DeepPartial<T[number]>[]
                : { [K in keyof T]?: DeepPartial<T[K]> }
              : T extends object
                ? { [K in keyof T]?: DeepPartial<T[K]> }
                : T;

/**
 * The inverse of DeepPartial — recursively makes every property required.
 */
export type DeepRequired<T> =
  T extends Builtin
    ? T
    : T extends Map<infer K, infer V>
      ? Map<DeepRequired<K>, DeepRequired<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
        : T extends Set<infer V>
          ? Set<DeepRequired<V>>
          : T extends ReadonlySet<infer V>
            ? ReadonlySet<DeepRequired<V>>
            : T extends readonly any[]
              ? number extends T['length']
                ? T extends any[]
                  ? DeepRequired<NonNullable<T[number]>>[]
                  : readonly DeepRequired<NonNullable<T[number]>>[]
                : { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
              : T extends object
                ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
                : NonNullable<T>;

type PathHeads<Paths extends string> = Paths extends `${infer Head}.${string}`
  ? Head
  : Paths;

type SubPaths<Paths extends string, K extends string> = Paths extends `${K}.${infer Tail}`
  ? Tail
  : never;

/**
 * Pick deeply nested properties using dot-notation path strings.
 */
export type DeepPick<T, Paths extends string> = {
  [K in keyof T as K extends PathHeads<Paths> ? K : never]:
    K extends Paths
      ? T[K]
      : SubPaths<Paths, K & string> extends never
        ? T[K]
        : NonNullable<T[K]> extends object
          ? undefined extends T[K]
            ? DeepPick<NonNullable<T[K]>, SubPaths<Paths, K & string>> | undefined
            : DeepPick<NonNullable<T[K]>, SubPaths<Paths, K & string>>
          : T[K];
};
