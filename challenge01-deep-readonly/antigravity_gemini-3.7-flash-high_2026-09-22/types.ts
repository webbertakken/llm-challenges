/**
 * Challenge 01 — Deep Readonly & Recursive Utility Types
 *
 * A suite of recursive utility types for nested object structures.
 */

/**
 * Built-in primitive types and function types that should not be recursed into.
 */
export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | undefined
  | null;

export type Builtin =
  | Primitive
  | Function
  | Date
  | Error
  | RegExp;

/**
 * 1. DeepReadonly<T>
 * Recursively makes every property in T (and nested objects, arrays, tuples, Maps, and Sets) readonly.
 *
 * Circular reference note:
 * TypeScript's compiler has recursion depth limits. Highly recursive self-referential
 * structures (e.g. type Node = { next: Node }) are handled up to TS compiler depth limits.
 */
export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer V>
  ? ReadonlySet<DeepReadonly<V>>
  : T extends ReadonlySet<infer V>
  ? ReadonlySet<DeepReadonly<V>>
  : T extends readonly (infer E)[]
  ? T extends readonly [infer Head, ...infer Tail]
    ? readonly [DeepReadonly<Head>, ...DeepReadonly<Tail>]
    : readonly DeepReadonly<E>[]
  : T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

/**
 * 2. DeepMutable<T>
 * The inverse of DeepReadonly — recursively strips readonly modifiers from every property,
 * array, tuple, Map, and Set.
 */
export type DeepMutable<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends ReadonlySet<infer V>
  ? Set<DeepMutable<V>>
  : T extends readonly (infer E)[]
  ? T extends readonly [infer Head, ...infer Tail]
    ? [DeepMutable<Head>, ...DeepMutable<Tail>]
    : DeepMutable<E>[]
  : T extends object
  ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
  : T;

/**
 * 3. DeepPartial<T>
 * Recursively makes every property optional in T.
 * Arrays and tuples remain arrays and tuples rather than becoming optional element tuples.
 */
export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
  : T extends Map<infer K, infer V>
  ? Map<DeepPartial<K>, DeepPartial<V>>
  : T extends ReadonlySet<infer V>
  ? ReadonlySet<DeepPartial<V>>
  : T extends Set<infer V>
  ? Set<DeepPartial<V>>
  : T extends readonly (infer E)[]
  ? T extends readonly [infer Head, ...infer Tail]
    ? [DeepPartial<Head>, ...DeepPartial<Tail>]
    : T extends readonly []
    ? []
    : T extends any[]
    ? DeepPartial<E>[]
    : readonly DeepPartial<E>[]
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

/**
 * 4. DeepRequired<T>
 * The inverse of DeepPartial — recursively makes every property required and strips undefined.
 */
export type DeepRequired<T> = T extends Builtin
  ? NonNullable<T>
  : T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<DeepRequired<NonNullable<K>>, DeepRequired<NonNullable<V>>>
  : T extends Map<infer K, infer V>
  ? Map<DeepRequired<NonNullable<K>>, DeepRequired<NonNullable<V>>>
  : T extends ReadonlySet<infer V>
  ? ReadonlySet<DeepRequired<NonNullable<V>>>
  : T extends Set<infer V>
  ? Set<DeepRequired<NonNullable<V>>>
  : T extends readonly (infer E)[]
  ? T extends readonly [infer Head, ...infer Tail]
    ? T extends any[]
      ? [DeepRequired<NonNullable<Head>>, ...DeepRequired<NonNullable<Tail>>]
      : readonly [DeepRequired<NonNullable<Head>>, ...DeepRequired<NonNullable<Tail>>]
    : T extends any[]
    ? DeepRequired<NonNullable<E>>[]
    : readonly DeepRequired<NonNullable<E>>[]
  : T extends object
  ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
  : NonNullable<T>;

/**
 * 5. DeepPick<T, Paths>
 * Picks deeply nested properties using dot-notation path strings (e.g. "a.b.c" | "a.e").
 */
type KeyOf<T> = keyof T & string;

type SubPath<Paths extends string, K extends string> = Paths extends `${K}.${infer Rest}`
  ? Rest
  : never;

export type DeepPick<T, Paths extends string> = T extends object
  ? {
      [K in KeyOf<T> as K extends Paths
        ? K
        : SubPath<Paths, K> extends never
        ? never
        : K]: K extends Paths
        ? T[K]
        : SubPath<Paths, K> extends never
        ? never
        : DeepPick<T[K], SubPath<Paths, K>>;
    }
  : T;
