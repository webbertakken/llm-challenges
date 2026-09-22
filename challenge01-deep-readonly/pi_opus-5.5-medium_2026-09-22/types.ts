/**
 * Recursive utility types for arbitrarily nested structures.
 *
 * Shared behaviour:
 * - Primitives, `null`, `undefined` and functions pass through unchanged.
 * - Well-known opaque built-ins (Date, RegExp, Error, Promise) are treated as leaves.
 * - Arrays and tuples keep their shape (tuples stay tuples) thanks to homomorphic mapped types.
 * - Maps and Sets are recursed into (keys and values).
 * - Unions are distributed over.
 *
 * Circular references: `DeepReadonly`, `DeepMutable`, `DeepPartial`, `DeepRequired` and `DeepPick`
 * are all lazily evaluated mapped types, so self-referential types such as
 * `interface Node { next: Node | null }` work (the recursion unfolds only as properties are accessed).
 * `Path<T>` must enumerate every path eagerly, so it is bounded by a depth limit (`MaxPathDepth`);
 * paths deeper than that into a circular type are not offered as valid `DeepPick` keys.
 */

export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

// `(...args: never) => unknown` is the top type of all function types.
export type AnyFunction = (...args: never) => unknown;

export type Leaf = Primitive | AnyFunction | Date | RegExp | Error | Promise<unknown>;

/** Recursively marks every property, array, tuple, Map and Set as readonly. */
export type DeepReadonly<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : { readonly [K in keyof T]: DeepReadonly<T[K]> };

/** Inverse of `DeepReadonly`: recursively strips every `readonly` modifier. */
export type DeepMutable<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlySet<infer U>
      ? Set<DeepMutable<U>>
      : { -readonly [K in keyof T]: DeepMutable<T[K]> };

/** Recursively makes every object property optional. Arrays and tuples keep their elements required. */
export type DeepPartial<T> = T extends Leaf
  ? T
  : T extends Map<infer K, infer V>
    ? Map<K, DeepPartial<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<K, DeepPartial<V>>
      : T extends Set<infer U>
        ? Set<DeepPartial<U>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepPartial<U>>
          : T extends readonly unknown[]
            ? { [K in keyof T]: DeepPartial<T[K]> }
            : { [K in keyof T]?: DeepPartial<T[K]> };

/** Inverse of `DeepPartial`: recursively makes every object property required. */
export type DeepRequired<T> = T extends Leaf
  ? T
  : T extends Map<infer K, infer V>
    ? Map<K, DeepRequired<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<K, DeepRequired<V>>
      : T extends Set<infer U>
        ? Set<DeepRequired<U>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepRequired<U>>
          : T extends readonly unknown[]
            ? { [K in keyof T]: DeepRequired<T[K]> }
            : { [K in keyof T]-?: DeepRequired<T[K]> };

/** Types that `Path` does not descend into (collections are picked as a whole). */
type PathLeaf = Leaf | readonly unknown[] | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>;

type MaxPathDepth = 8;

/** Every valid dot-notation path into `T` (objects only; arrays, Maps and Sets are leaves). */
export type Path<T, Depth extends unknown[] = []> = Depth["length"] extends MaxPathDepth
  ? never
  : T extends PathLeaf
    ? never
    : {
        [K in keyof T & string]:
          | K
          | `${K}.${Path<NonNullable<T[K]>, [...Depth, unknown]>}`;
      }[keyof T & string];

type HeadOf<P extends string> = P extends `${infer H}.${string}` ? H : P;
type TailOf<P extends string, K extends string> = P extends `${K}.${infer R}` ? R : never;

type DeepPickImpl<T, P extends string> = T extends PathLeaf
  ? T
  : {
      [K in keyof T as K extends HeadOf<P> ? K : never]: K extends P
        ? T[K]
        : DeepPickImpl<T[K], TailOf<P, K & string>>;
    };

/** Picks deeply nested properties using dot-notation paths, preserving modifiers along the way. */
export type DeepPick<T, P extends Path<T>> = DeepPickImpl<T, P>;
