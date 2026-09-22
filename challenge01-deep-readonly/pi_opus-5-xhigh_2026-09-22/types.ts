/**
 * Recursive utility types for arbitrarily nested structures.
 *
 * Design notes
 * ------------
 * - Every type is built from one shape: "stop at an atomic type, otherwise
 *   rebuild the container and recurse into it".
 * - `Atomic` is the set of leaves we must never map over: primitives,
 *   callables and the built-in object types whose internals are opaque
 *   (`Date`, `RegExp`). Mapping over those would destroy them.
 * - Order matters: `Map`/`Set` are checked before the generic array and
 *   object branches, and the mutable variants before the readonly ones
 *   (`Map<K, V>` is assignable to `ReadonlyMap<K, V>`, not the reverse).
 * - Arrays and tuples share a single homomorphic mapped type. Homomorphic
 *   mapping over `readonly unknown[]` preserves tuple arity, element labels
 *   and optional elements, so `[string, number]` never widens to
 *   `(string | number)[]`.
 *
 * Limitations
 * -----------
 * - Circular references: TypeScript evaluates these types lazily, so a
 *   self-referential *interface* (`interface Node { children: Node[] }`) is
 *   handled fine — the recursion only unfolds as deep as it is observed.
 *   A self-referential *type alias* that is eagerly expanded at the point of
 *   use can still hit "Type instantiation is excessively deep and possibly
 *   infinite"; `DeepKeys` (which must enumerate every path) is the one type
 *   here that cannot be used on a cyclic structure at all.
 * - `WeakMap`/`WeakSet` are treated as plain objects with no public keys, so
 *   they pass through structurally unchanged.
 */

/** Values that are never recursed into. */
export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

/** Leaves: primitives, callables (incl. constructors) and opaque built-ins. */
// eslint-disable-next-line @typescript-eslint/ban-types -- `Function` is the only type that covers overloads + constructors
export type Atomic = Primitive | Function | Date | RegExp;

/* -------------------------------------------------------------------------- */
/* 1. DeepReadonly                                                            */
/* -------------------------------------------------------------------------- */

export type DeepReadonly<T> = T extends Atomic
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends readonly unknown[]
        ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

/* -------------------------------------------------------------------------- */
/* 2. DeepMutable                                                             */
/* -------------------------------------------------------------------------- */

export type DeepMutable<T> = T extends Atomic
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlySet<infer U>
      ? Set<DeepMutable<U>>
      : T extends readonly unknown[]
        ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
        : T extends object
          ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
          : T;

/* -------------------------------------------------------------------------- */
/* 3. DeepPartial                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Optionality is applied to object properties only. Array and tuple elements
 * are recursed into but never made optional, so an array stays an array.
 * Map/Set mutability is preserved.
 */
export type DeepPartial<T> = T extends Atomic
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
            : T extends object
              ? { [K in keyof T]?: DeepPartial<T[K]> }
              : T;

/* -------------------------------------------------------------------------- */
/* 4. DeepRequired                                                            */
/* -------------------------------------------------------------------------- */

export type DeepRequired<T> = T extends Atomic
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
            ? { [K in keyof T]-?: DeepRequired<T[K]> }
            : T extends object
              ? { [K in keyof T]-?: DeepRequired<Exclude<T[K], undefined>> }
              : T;

/* -------------------------------------------------------------------------- */
/* 5. DeepPick                                                                */
/* -------------------------------------------------------------------------- */

/** Every dot path through `T`, stopping at atomics, arrays, Maps and Sets. */
export type DeepKeys<T> = T extends
  | Atomic
  | readonly unknown[]
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  ? never
  : T extends object
    ? {
        [K in keyof T & string]:
          | K
          | `${K}.${DeepKeys<Exclude<T[K], undefined>> & string}`;
      }[keyof T & string]
    : never;

/** The first segment of a dot path (`"a.b.c"` -> `"a"`). */
type HeadOf<P extends string> = P extends `${infer H}.${string}` ? H : P;

/** Every remainder of the paths in `P` that start with segment `K`. */
type TailsOf<P extends string, K extends string> = P extends `${K}.${infer R}`
  ? R
  : never;

type DeepPickInternal<T, P extends string> = {
  [K in HeadOf<P> & keyof T & string]: K extends P
    ? T[K] // the whole subtree was requested (e.g. "a" as well as "a.b")
    : DeepPickInternal<T[K], TailsOf<P, K>>;
};

/**
 * Pick deeply nested properties by dot-notation path.
 * Paths are validated against `DeepKeys<T>`, so typos are compile errors.
 */
export type DeepPick<T, Paths extends DeepKeys<T>> = DeepPickInternal<
  T,
  Paths & string
>;
