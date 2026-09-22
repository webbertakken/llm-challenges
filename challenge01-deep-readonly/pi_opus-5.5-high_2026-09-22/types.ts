/**
 * Recursive utility types for arbitrarily nested object structures.
 *
 * Shared behaviour:
 * - Primitives, `null`, `undefined`, functions and opaque built-ins (`Date`, `RegExp`, `Error`)
 *   are leaves: they pass through unchanged.
 * - Arrays and tuples are mapped homomorphically, so tuples keep their shape and arity.
 * - `Map`/`Set` (and their readonly counterparts) are recursed into (keys and values).
 * - Unions distribute: `DeepReadonly<A | B>` is `DeepReadonly<A> | DeepReadonly<B>`.
 *
 * Circular references: `DeepReadonly`, `DeepMutable`, `DeepPartial` and `DeepRequired` are built on
 * deferred mapped types, so self-referencing interfaces (`interface Node { next: Node | null }`)
 * work: each level is only expanded when it is accessed. `Path<T>` must enumerate every path
 * eagerly, so it stops descending after `MaxPathDepth` levels; paths into a cycle beyond that
 * depth are not offered (and therefore not accepted by `DeepPick`).
 */

export type Primitive = string | number | bigint | boolean | symbol | null | undefined;

/** Top type for functions: every function type is assignable to it. */
export type AnyFunction = (...args: never[]) => unknown;

/** Values treated as opaque leaves by every deep utility. */
export type Leaf = Primitive | AnyFunction | Date | RegExp | Error;

// ---------------------------------------------------------------------------
// 1. DeepReadonly
// ---------------------------------------------------------------------------

export type DeepReadonly<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : { readonly [K in keyof T]: DeepReadonly<T[K]> };

// ---------------------------------------------------------------------------
// 2. DeepMutable
// ---------------------------------------------------------------------------

export type DeepMutable<T> = T extends Leaf
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlySet<infer U>
      ? Set<DeepMutable<U>>
      : { -readonly [K in keyof T]: DeepMutable<T[K]> };

// ---------------------------------------------------------------------------
// 3. DeepPartial
// ---------------------------------------------------------------------------

/**
 * Arrays stay arrays (their elements become deep-partial, but no `?` is added to the element
 * slots, so `T[]` never turns into `(T | undefined)[]` and tuples keep their arity).
 * Mutability of arrays, tuples, Maps and Sets is preserved.
 */
export type DeepPartial<T> = T extends Leaf
  ? T
  : T extends Map<infer K, infer V>
    ? Map<DeepPartial<K>, DeepPartial<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
      : T extends Set<infer U>
        ? Set<DeepPartial<U>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepPartial<U>>
          : T extends readonly unknown[]
            ? { [K in keyof T]: DeepPartial<T[K]> }
            : { [K in keyof T]?: DeepPartial<T[K]> };

// ---------------------------------------------------------------------------
// 4. DeepRequired
// ---------------------------------------------------------------------------

/**
 * Removes `?` everywhere (including optional tuple elements). Like the built-in `Required`,
 * `undefined` is stripped only where it came from optionality, not from explicit
 * `x: T | undefined` declarations. Consequently an optional property typed only as `undefined`
 * (`x?: undefined`) becomes `x: never`.
 */
export type DeepRequired<T> = T extends Leaf
  ? T
  : T extends Map<infer K, infer V>
    ? Map<DeepRequired<K>, DeepRequired<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
      : T extends Set<infer U>
        ? Set<DeepRequired<U>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepRequired<U>>
          : { [K in keyof T]-?: DeepRequired<T[K]> };

// ---------------------------------------------------------------------------
// 5. DeepPick
// ---------------------------------------------------------------------------

type MaxPathDepth = 8;

/** Every dot-notation path into the plain-object structure of `T` (optional props included). */
export type Path<T, Depth extends unknown[] = []> = Depth["length"] extends MaxPathDepth
  ? never
  : T extends Leaf | ReadonlyMap<unknown, unknown> | ReadonlySet<unknown> | readonly unknown[]
    ? never
    : {
        [K in keyof T & string]-?: K | `${K}.${Path<NonNullable<T[K]>, [...Depth, unknown]>}`;
      }[keyof T & string];

type Head<P extends string> = P extends `${infer H}.${string}` ? H : P;
type Tail<P extends string, H extends string> = P extends `${H}.${infer R}` ? R : never;

type DeepPickImpl<T, P extends string> = T extends object
  ? {
      [K in keyof T as K extends Head<P> ? K : never]: K extends P
        ? T[K]
        : DeepPickImpl<T[K], Tail<P, K & string>>;
    }
  : T;

/**
 * Picks nested properties by dot-notation paths. Optional/readonly modifiers of every picked
 * property are preserved; `null`/`undefined` in an optional branch are kept alongside the pick.
 * Picking a path also picks its whole value (`"a"` wins over `"a.b"`).
 */
export type DeepPick<T, Paths extends Path<T>> = DeepPickImpl<T, Paths>;
