/**
 * Recursive utility types for arbitrarily nested object structures.
 *
 * Shared rules for every `Deep*` type:
 * - Primitives, `null`, `undefined`, functions, constructors, `Date` and `RegExp` are atomic:
 *   they pass through unchanged (so `DeepReadonly<string>` is `string`).
 * - `any` and `unknown` pass through unchanged (a mapped type would otherwise turn them into `{}`).
 * - Unions distribute: `DeepReadonly<A | null>` is `DeepReadonly<A> | null`.
 * - Arrays stay arrays and tuples stay tuples (same arity, same positions), because the recursion
 *   goes through homomorphic mapped types, which TypeScript applies element-wise to array types.
 * - `Map`/`Set` (and their readonly variants) are recursed into via their type arguments.
 *
 * Circular references: self-referential types (`interface Node { next: Node | null }`) are fine
 * for `DeepReadonly`, `DeepMutable`, `DeepPartial`, `DeepRequired` and `DeepPick`, because mapped
 * types are resolved lazily, one property access at a time. `Paths` has to enumerate every path
 * eagerly, so it stops after `Depth` segments (default 8). Consequently `DeepPick` on a recursive
 * type only accepts paths up to that depth, and very wide recursive types can make `Paths` large.
 */

export type Primitive = string | number | bigint | boolean | symbol | null | undefined;

/** Values that are never recursed into. */
export type Atomic =
  | Primitive
  | ((...args: never[]) => unknown)
  | (abstract new (...args: never[]) => unknown)
  | Date
  | RegExp;

/** Recursively marks every property, array, tuple, `Map` and `Set` as readonly. */
export type DeepReadonly<T> = unknown extends T
  ? T
  : T extends Atomic
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlySet<infer E>
        ? ReadonlySet<DeepReadonly<E>>
        : { readonly [P in keyof T]: DeepReadonly<T[P]> };

/** Inverse of `DeepReadonly`: recursively strips `readonly` from properties, arrays, tuples, maps and sets. */
export type DeepMutable<T> = unknown extends T
  ? T
  : T extends Atomic
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlySet<infer E>
        ? Set<DeepMutable<E>>
        : { -readonly [P in keyof T]: DeepMutable<T[P]> };

/**
 * Recursively makes every object property optional.
 * Arrays and tuples keep their shape (elements are deep-partial, never optional), map keys are
 * kept as-is and map values and set elements are deep-partial.
 */
export type DeepPartial<T> = unknown extends T
  ? T
  : T extends Atomic
    ? T
    : T extends Map<infer K, infer V>
      ? Map<K, DeepPartial<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepPartial<V>>
        : T extends Set<infer E>
          ? Set<DeepPartial<E>>
          : T extends ReadonlySet<infer E>
            ? ReadonlySet<DeepPartial<E>>
            : T extends readonly unknown[]
              ? { [I in keyof T]: DeepPartial<T[I]> }
              : { [P in keyof T]?: DeepPartial<T[P]> };

/**
 * Inverse of `DeepPartial`: recursively makes every property (and every optional tuple element)
 * required. Like the built-in `Required`, `-?` also removes `undefined` from the property type and
 * from array element types.
 */
export type DeepRequired<T> = unknown extends T
  ? T
  : T extends Atomic
    ? T
    : T extends Map<infer K, infer V>
      ? Map<K, DeepRequired<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<K, DeepRequired<V>>
        : T extends Set<infer E>
          ? Set<DeepRequired<E>>
          : T extends ReadonlySet<infer E>
            ? ReadonlySet<DeepRequired<E>>
            : { [P in keyof T]-?: DeepRequired<T[P]> };

/** Values a dot-notation path stops at: atomics and collections that are not plain objects. */
type PathLeaf = Atomic | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>;

type Decrement = [0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

/**
 * Every dot-notation path into `T` (`"a" | "a.b" | "a.b.c"`), at most `Depth` segments long.
 * Arrays are transparent: `{ users: { id: number }[] }` has the paths `"users" | "users.id"`.
 */
export type Paths<T, Depth extends number = 8> = Depth extends 0
  ? never
  : unknown extends T
    ? never
    : T extends PathLeaf
      ? never
      : T extends readonly (infer E)[]
        ? Paths<E, Depth>
        : { [K in keyof T & string]: K | `${K}.${Paths<T[K], Decrement[Depth]>}` }[keyof T & string];

/** First segment of a path: `"a.b.c"` becomes `"a"`. */
type Head<P extends string> = P extends `${infer H}.${string}` ? H : P;

/** The rest of every path in `P` that starts with segment `K`: (`"a.b.c"`, `"a"`) becomes `"b.c"`. */
type Tail<P extends string, K extends string> = P extends `${K}.${infer R}` ? R : never;

type PickPaths<T, P extends string> = unknown extends T
  ? T
  : T extends PathLeaf
    ? T
    : T extends readonly unknown[]
      ? { [I in keyof T]: PickPaths<T[I], P> }
      : {
          [K in keyof T as K extends Head<P> ? K : never]: K extends P
            ? T[K]
            : PickPaths<T[K], Tail<P, K & string>>;
        };

/**
 * Picks deeply nested properties by dot-notation path. A path that ends at an object keeps the whole
 * subtree; `readonly` and `?` modifiers of picked properties are preserved; picking through an array
 * picks from each element. Invalid paths are rejected by the `Paths<T>` constraint.
 */
export type DeepPick<T, P extends Paths<T>> = PickPaths<T, P>;
