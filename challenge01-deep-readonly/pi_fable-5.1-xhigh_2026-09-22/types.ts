/**
 * Recursive utility types for arbitrarily nested structures.
 *
 * Every type walks objects, arrays, tuples, Maps and Sets. Primitives,
 * functions, Dates and RegExps are leaves and pass through untouched.
 *
 * Circular references: the object-walking types (`DeepReadonly`,
 * `DeepMutable`, `DeepPartial`, `DeepRequired`) are safe on self-referencing
 * types because mapped-type members are resolved lazily. `DeepKeyOf` (and
 * therefore the path validation of `DeepPick`) must enumerate paths eagerly,
 * so it stops after `MaxDepth` levels.
 */

/** Values without nested structure. */
export type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/** Any callable value. */
export type AnyFunction = (...args: never[]) => unknown;

/** Leaves that are never descended into. */
export type Atomic = Primitive | AnyFunction | Date | RegExp;

/** Recursively makes every property, array, tuple, Map and Set readonly. */
export type DeepReadonly<T> = unknown extends T
  ? T
  : T extends Atomic
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlySet<infer V>
        ? ReadonlySet<DeepReadonly<V>>
        : { readonly [K in keyof T]: DeepReadonly<T[K]> };

/** Recursively strips readonly from every property, array, tuple, Map and Set. */
export type DeepMutable<T> = unknown extends T
  ? T
  : T extends Atomic
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlySet<infer V>
        ? Set<DeepMutable<V>>
        : { -readonly [K in keyof T]: DeepMutable<T[K]> };

/**
 * Recursively makes every property optional. Array and tuple elements are
 * deep-partialised but stay in place; Map keys are left alone.
 */
export type DeepPartial<T> = unknown extends T
  ? T
  : T extends Atomic
    ? T
    : T extends Map<infer K, infer V>
      ? Map<K, DeepPartial<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepPartial<V>>
        : T extends Set<infer V>
          ? Set<DeepPartial<V>>
          : T extends ReadonlySet<infer V>
            ? ReadonlySet<DeepPartial<V>>
            : T extends readonly unknown[]
              ? { [I in keyof T]: DeepPartial<T[I]> }
              : { [K in keyof T]?: DeepPartial<T[K]> };

/** The exact inverse of `DeepPartial`: recursively makes every property required. */
export type DeepRequired<T> = unknown extends T
  ? T
  : T extends Atomic
    ? T
    : T extends Map<infer K, infer V>
      ? Map<K, DeepRequired<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepRequired<V>>
        : T extends Set<infer V>
          ? Set<DeepRequired<V>>
          : T extends ReadonlySet<infer V>
            ? ReadonlySet<DeepRequired<V>>
            : T extends readonly unknown[]
              ? { [I in keyof T]: DeepRequired<T[I]> }
              : { [K in keyof T]-?: DeepRequired<T[K]> };

/** Maximum nesting level enumerated by `DeepKeyOf`. */
type MaxDepth = 10;
type Decrement = [never, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Every dot-notation path into the plain-object parts of `T`, at most
 * `MaxDepth` segments long. Arrays, Maps and Sets are leaves for paths.
 */
export type DeepKeyOf<T, D extends number = MaxDepth> = [D] extends [never]
  ? never
  : T extends Atomic | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown> | readonly unknown[]
    ? never
    : {
        [K in keyof T & (string | number)]: `${K}` | `${K}.${DeepKeyOf<T[K], Decrement[D]>}`;
      }[keyof T & (string | number)];

type KeyText<K> = K extends string | number ? `${K}` : never;
type Head<P extends string> = P extends `${infer H}.${string}` ? H : P;
type Tail<P extends string, H extends string> = P extends `${H}.${infer R}` ? R : never;

type PickPaths<T, P extends string> = {
  [K in keyof T as KeyText<K> extends Head<P> ? K : never]: KeyText<K> extends P
    ? T[K]
    : PickPaths<T[K], Tail<P, KeyText<K>>>;
};

/**
 * Picks deeply nested properties by dot-notation paths. A path that names a
 * property keeps that property whole; readonly and optional modifiers are
 * preserved along the way. Paths must be valid `DeepKeyOf<T>` members, so
 * keys containing dots cannot be addressed.
 */
export type DeepPick<T, Paths extends DeepKeyOf<T>> = PickPaths<T, Paths>;
