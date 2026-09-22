/**
 * Recursive, type-level utilities for arbitrarily nested structures.
 *
 * A note on circular references:
 * TypeScript resolves recursive type aliases lazily (since 4.1), so these
 * utilities happily walk self-referential *interfaces* and classes. The only
 * limitation is the compiler's instantiation depth budget (roughly 50 nested
 * conditional instantiations, 100 for some older versions). A type that is
 * infinitely deep at definition time (e.g. `type T = { next: T } & { x: 1 }`
 * is fine, but a type alias that expands to itself without an object/lazy
 * boundary is a hard error at declaration). Extremely deep (100+ level) data
 * shapes can therefore hit "Type instantiation is excessively deep" - this is
 * a compiler limit, not a flaw in the algorithms below.
 */

/** Functions are opaque leaves: they are never recursed into. */
type AnyFunction = (...args: never[]) => unknown;

type DeepReadonlyArray<T extends readonly unknown[]> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};

type DeepMutableArray<T extends readonly unknown[]> = {
  -readonly [K in keyof T]: DeepMutable<T[K]>;
};

/**
 * Recursively marks every property `readonly`, including array/tuple elements,
 * `Map`/`Set` (as `ReadonlyMap`/`ReadonlySet`) and nested objects.
 * Primitives, `null`, `undefined` and functions pass through unchanged.
 */
export type DeepReadonly<T> = T extends AnyFunction
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends readonly unknown[]
        ? DeepReadonlyArray<T>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

/**
 * The inverse of {@link DeepReadonly}: strips `readonly` from every property,
 * array/tuple element and turns `ReadonlyMap`/`ReadonlySet` back into their
 * mutable counterparts.
 */
export type DeepMutable<T> = T extends AnyFunction
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlySet<infer U>
      ? Set<DeepMutable<U>>
      : T extends readonly unknown[]
        ? DeepMutableArray<T>
        : T extends object
          ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
          : T;

/**
 * Recursively makes every property optional. Arrays and tuples keep their
 * shape - elements become deeply partial, but the container is not turned into
 * an optional-element tuple.
 */
export type DeepPartial<T> = T extends AnyFunction
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepPartial<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepPartial<U>>
      : T extends readonly unknown[]
        ? { [K in keyof T]: DeepPartial<T[K]> }
        : T extends object
          ? { [K in keyof T]?: DeepPartial<T[K]> }
          : T;

/**
 * The inverse of {@link DeepPartial}: removes `?` from every nested property.
 * Note that, like the built-in `Required<T>`, an explicit `undefined` in the
 * property type is not stripped.
 */
export type DeepRequired<T> = T extends AnyFunction
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<K, DeepRequired<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepRequired<U>>
      : T extends readonly unknown[]
        ? { [K in keyof T]-?: DeepRequired<T[K]> }
        : T extends object
          ? { [K in keyof T]-?: DeepRequired<T[K]> }
          : T;

/** For a key `K`, the remaining tails of every path rooted at `K`. */
type PathsFor<K extends string, Paths extends string> = Paths extends `${K}.${infer Rest}`
  ? Rest
  : never;

/**
 * A key is picked when it is selected whole, or is the head of a deeper path
 * that actually resolves to at least one property below it. Branches that
 * resolve to nothing are pruned, so a path like `"a.missing.deep"` yields `{}`.
 */
type IsPickedKey<K extends string, TK, Paths extends string> = K extends Paths
  ? true
  : [PathsFor<K, Paths>] extends [never]
    ? false
    : [keyof DeepPick<TK, PathsFor<K, Paths>>] extends [never]
      ? false
      : true;

type DeepPickKey<T, K extends keyof T, Paths extends string> = K extends string
  ? K extends Paths
    ? T[K]
    : DeepPick<T[K], PathsFor<K, Paths>>
  : T[K];

/**
 * Picks deeply nested properties using dot-notation path strings, preserving
 * the selected shape. A path that is a prefix of another contributes the whole
 * subtree, so `"a.e"` wins for `e` while `"a.b.c"` descends into `b`.
 */
export type DeepPick<T, Paths extends string> = {
  [K in keyof T as K extends string
    ? IsPickedKey<K, T[K], Paths> extends true
      ? K
      : never
    : never]: DeepPickKey<T, K, Paths>;
};
