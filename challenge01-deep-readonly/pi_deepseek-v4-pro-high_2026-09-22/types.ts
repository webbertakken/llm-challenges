/**
 * Recursive utility types operating on arbitrarily nested structures.
 *
 * All types are type-level only; no runtime code is exported.
 */

/** Values that never need to be traversed further. */
export type Primitive = string | number | boolean | bigint | symbol | undefined | null;

/**
 * Recursively makes every property of `T` (and all nested objects, arrays,
 * tuples, Maps and Sets) `readonly`. Primitives, functions, `null` and
 * `undefined` pass through unchanged.
 */
export type DeepReadonly<T> = T extends Primitive | Function
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
    : T extends ReadonlySet<infer V>
      ? ReadonlySet<DeepReadonly<V>>
      : { readonly [K in keyof T]: DeepReadonly<T[K]> };

/**
 * The inverse of `DeepReadonly`: strips `readonly` recursively from every
 * property, array, tuple, Map and Set.
 */
export type DeepMutable<T> = T extends Primitive | Function
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlySet<infer V>
      ? Set<DeepMutable<V>>
      : { -readonly [K in keyof T]: DeepMutable<T[K]> };

/**
 * Recursively makes every property optional, including nested objects.
 * Arrays and tuples keep their shape (elements stay required, and tuples
 * remain tuples) while still recursing into their elements. Map and Set
 * containers are kept (their mutability is unchanged) and their values are
 * recursed into.
 */
export type DeepPartial<T> = T extends Map<infer K, infer V>
  ? Map<K, DeepPartial<V>>
  : T extends Set<infer V>
    ? Set<DeepPartial<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<K, DeepPartial<V>>
      : T extends ReadonlySet<infer V>
        ? ReadonlySet<DeepPartial<V>>
        : T extends Function
          ? T
          : T extends readonly unknown[]
            ? { [K in keyof T]: DeepPartial<T[K]> }
            : T extends object
              ? { [K in keyof T]?: DeepPartial<T[K]> }
              : T;

/**
 * The inverse of `DeepPartial`: recursively makes every property required,
 * and strips the `undefined` that optionality introduced so that
 * `DeepRequired<DeepPartial<T>>` equals `T` for object types whose values
 * do not intentionally include `undefined`.
 */
export type DeepRequired<T> = T extends Map<infer K, infer V>
  ? Map<K, DeepRequired<V>>
  : T extends Set<infer V>
    ? Set<DeepRequired<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<K, DeepRequired<V>>
      : T extends ReadonlySet<infer V>
        ? ReadonlySet<DeepRequired<V>>
        : T extends Function
          ? T
          : T extends readonly unknown[]
            ? { [K in keyof T]-?: DeepRequired<T[K]> }
            : T extends object
              ? { [K in keyof T]-?: DeepRequired<Exclude<T[K], undefined>> }
              : T;

type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

/**
 * Collapses an intersection of object types into a single flat object type,
 * recursing through shared keys. Map, Set, array and tuple leaves are kept
 * intact (with their original mutability) so their structural type is
 * preserved.
 */
type Flatten<T> = T extends Map<infer K, infer V>
  ? Map<K, V>
  : T extends Set<infer V>
    ? Set<V>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<K, V>
      : T extends ReadonlySet<infer V>
        ? ReadonlySet<V>
        : T extends readonly unknown[]
          ? T
          : T extends Function
            ? T
            : T extends object
              ? { [K in keyof T]: Flatten<T[K]> }
              : T;

type DeepPickOne<T, Path extends string> = Path extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? { [K in Head]: DeepPickOne<T[Head], Rest> }
    : never
  : Path extends keyof T
    ? { [K in Path]: T[Path] }
    : never;

/**
 * Picks deeply nested properties addressed by dot-notation path strings.
 * A union of paths is merged back into a single nested object.
 *
 *   DeepPick<Original, "a.b.c" | "a.e">
 *   // => { a: { b: { c: number }; e: Map<string, { f: boolean }> } }
 */
export type DeepPick<T, Path extends string> = Flatten<
  UnionToIntersection<DeepPickOne<T, Path>>
>;
