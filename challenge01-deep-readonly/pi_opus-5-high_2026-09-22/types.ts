/**
 * Recursive utility types for arbitrarily nested structures.
 *
 * Design notes
 * ------------
 * Every type follows the same shape:
 *   1. leaves (primitives, functions) pass through untouched;
 *   2. `Map`/`Set` (and their readonly counterparts) are rebuilt with recursed
 *      key/value types;
 *   3. everything else goes through a *homomorphic* mapped type
 *      (`{ [K in keyof T]: ... }`), which preserves arrays, tuples, optionality
 *      and `readonly` modifiers automatically.
 *
 * Limitation — circular references
 * --------------------------------
 * These types are lazy only where TypeScript makes them lazy. A self
 * referential *interface* or *named type alias* (`interface Node { kids: Node[] }`)
 * works, because the recursion is deferred behind a named reference and the
 * checker instantiates it on demand. A structurally infinite type produced
 * *inside* one of these utilities (e.g. mapping over an anonymous recursive
 * type built by another conditional type) can hit the "type instantiation is
 * excessively deep" limit. No cycle *tracking* is performed: a cyclic value at
 * runtime is irrelevant, but a type that is cyclic through more than ~50 levels
 * of instantiation will be rejected by the compiler rather than silently
 * truncated.
 */

/** Values that are treated as leaves: never recursed into. */
export type Primitive =
  | string
  | number
  | boolean
  | bigint
  | symbol
  | null
  | undefined;

/** Any callable, matched without resorting to the unsafe global `Function`. */
export type AnyFunction = (...args: never[]) => unknown;

/** Leaves shared by every utility below. */
type Leaf = Primitive | AnyFunction;

/* -------------------------------------------------------------------------- */
/* 1. DeepReadonly                                                            */
/* -------------------------------------------------------------------------- */

export type DeepReadonly<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : { readonly [K in keyof T]: DeepReadonly<T[K]> };

/* -------------------------------------------------------------------------- */
/* 2. DeepMutable                                                             */
/* -------------------------------------------------------------------------- */

export type DeepMutable<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlySet<infer U>
      ? Set<DeepMutable<U>>
      : { -readonly [K in keyof T]: DeepMutable<T[K]> };

/* -------------------------------------------------------------------------- */
/* 3. DeepPartial                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Arrays and tuples keep their arity and element positions: only the element
 * *contents* are made partial, so `string[]` stays `string[]` and
 * `[string, number]` stays a 2-tuple instead of collapsing into
 * `(string | number | undefined)[]`.
 */
export type DeepPartial<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? T extends Map<K, V>
      ? Map<K, DeepPartial<V>>
      : ReadonlyMap<K, DeepPartial<V>>
    : T extends ReadonlySet<infer U>
      ? T extends Set<U>
        ? Set<DeepPartial<U>>
        : ReadonlySet<DeepPartial<U>>
      : T extends readonly unknown[]
        ? { [K in keyof T]: DeepPartial<T[K]> }
        : { [K in keyof T]?: DeepPartial<T[K]> };

/* -------------------------------------------------------------------------- */
/* 4. DeepRequired                                                            */
/* -------------------------------------------------------------------------- */

export type DeepRequired<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? T extends Map<K, V>
      ? Map<K, DeepRequired<V>>
      : ReadonlyMap<K, DeepRequired<V>>
    : T extends ReadonlySet<infer U>
      ? T extends Set<U>
        ? Set<DeepRequired<U>>
        : ReadonlySet<DeepRequired<U>>
      : T extends readonly unknown[]
        ? { [K in keyof T]: DeepRequired<T[K]> }
        : { [K in keyof T]-?: DeepRequired<T[K]> };

/* -------------------------------------------------------------------------- */
/* 5. DeepPick                                                                */
/* -------------------------------------------------------------------------- */

/** Every legal dot-path through `T`, including the intermediate prefixes. */
export type DeepPaths<T> = T extends
  | Leaf
  | ReadonlyMap<unknown, unknown>
  | ReadonlySet<unknown>
  | readonly unknown[]
  ? never
  : {
      [K in keyof T & string]:
        | K
        | `${K}.${DeepPaths<NonNullable<T[K]>> & string}`;
    }[keyof T & string];

/** Rebuilds the single nested object described by one dot-path. */
type PickPath<T, P extends string> = P extends `${infer Head}.${infer Rest}`
  ? Head extends keyof T
    ? { [K in Head]: PickPath<NonNullable<T[K]>, Rest> }
    : never
  : P extends keyof T
    ? { [K in P]: T[P] }
    : never;

/** Classic union-to-intersection via contravariant inference. */
type UnionToIntersection<U> = (U extends unknown ? (x: U) => void : never) extends (
  x: infer I,
) => void
  ? I
  : never;

/** Collapses `{a:{b:1}} & {a:{c:2}}` into `{a:{b:1;c:2}}` without touching leaves. */
type Flatten<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<unknown, unknown> | ReadonlySet<unknown> | readonly unknown[]
    ? T
    : { [K in keyof T]: Flatten<T[K]> };

export type DeepPick<T, Paths extends DeepPaths<T>> = Flatten<
  UnionToIntersection<PickPath<T, Paths & string>>
>;
