/**
 * Deep recursive utility types.
 *
 * Design notes
 * ------------
 * - Primitives, `null`, `undefined`, and functions pass through unchanged.
 * - `Date`, `RegExp`, and `Error` are also treated as leaves so we don't try
 *   to walk their internal shapes.
 * - Tuples are preserved as tuples (each element mapped element-wise) rather
 *   than collapsed to homogeneous arrays / unions. Detection is via the
 *   `IsTuple` helper so that tuples with optional or rest elements still
 *   work.
 * - `Map`/`Set` (and their readonly counterparts) are special-cased so the
 *   modifier propagates to the value types and the container shape is
 *   correct.
 * - The mutable vs readonly distinction of arrays / Maps / Sets is
 *   preserved in `DeepPartial` and `DeepRequired` (those types only change
 *   optionality, not readonliness).
 * - All recursion is structural; TypeScript does not natively guard against
 *   cyclic interface types. In practice the language re-uses the same type
 *   alias when a back-edge is hit, so canonical cyclic shapes (e.g.
 *   `interface Node { children: Node[] }`) work fine. Mutually recursive
 *   shapes that exceed TS's recursion limit are not supported.
 */

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

type Primitive =
  | string
  | number
  | bigint
  | boolean
  | symbol
  | null
  | undefined;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

/** Things that should be treated as opaque leaves. */
type Builtin = Primitive | AnyFunction | Date | RegExp | Error;

/**
 * `true` when `T` is a tuple type (fixed-length / variadic) and `false`
 * for unbounded arrays. A tuple has a numeric-literal `length` (or a
 * small union of them); a plain array has `length: number`.
 */
type IsTuple<T> = T extends readonly unknown[]
  ? number extends T["length"]
    ? false
    : true
  : false;

/** `true` for mutable arrays / tuples, `false` for their readonly form. */
type IsMutableArray<T> = T extends unknown[] ? true : false;

// ---------------------------------------------------------------------------
// DeepReadonly
// ---------------------------------------------------------------------------

export type DeepReadonly<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends ReadonlySet<infer U>
      ? ReadonlySet<DeepReadonly<U>>
      : T extends ReadonlyArray<infer U>
        ? IsTuple<T> extends true
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : ReadonlyArray<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

// ---------------------------------------------------------------------------
// DeepMutable
// ---------------------------------------------------------------------------

export type DeepMutable<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlySet<infer U>
      ? Set<DeepMutable<U>>
      : T extends ReadonlyArray<infer U>
        ? IsTuple<T> extends true
          ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
          : Array<DeepMutable<U>>
        : T extends object
          ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
          : T;

// ---------------------------------------------------------------------------
// DeepPartial
// ---------------------------------------------------------------------------

export type DeepPartial<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? Map<K, DeepPartial<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<K, DeepPartial<V>>
      : T extends Set<infer U>
        ? Set<DeepPartial<U>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepPartial<U>>
          : T extends ReadonlyArray<infer U>
            ? IsTuple<T> extends true
              ? IsMutableArray<T> extends true
                ? { [K in keyof T]?: DeepPartial<T[K]> }
                : { readonly [K in keyof T]?: DeepPartial<T[K]> }
              : IsMutableArray<T> extends true
                ? Array<DeepPartial<U>>
                : ReadonlyArray<DeepPartial<U>>
            : T extends object
              ? { [K in keyof T]?: DeepPartial<T[K]> }
              : T;

// ---------------------------------------------------------------------------
// DeepRequired
// ---------------------------------------------------------------------------

export type DeepRequired<T> = T extends Builtin
  ? T
  : T extends Map<infer K, infer V>
    ? Map<K, DeepRequired<V>>
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<K, DeepRequired<V>>
      : T extends Set<infer U>
        ? Set<DeepRequired<U>>
        : T extends ReadonlySet<infer U>
          ? ReadonlySet<DeepRequired<U>>
          : T extends ReadonlyArray<infer U>
            ? IsTuple<T> extends true
              ? IsMutableArray<T> extends true
                ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
                : { readonly [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
              : IsMutableArray<T> extends true
                ? Array<DeepRequired<U>>
                : ReadonlyArray<DeepRequired<U>>
            : T extends object
              ? { [K in keyof T]-?: DeepRequired<NonNullable<T[K]>> }
              : T;

// ---------------------------------------------------------------------------
// DeepPick
// ---------------------------------------------------------------------------

/** Splits "a.b.c" -> ["a", "b", "c"]. */
type Split<S extends string> = S extends `${infer Head}.${infer Tail}`
  ? [Head, ...Split<Tail>]
  : [S];

/**
 * Given an object `T` and a tuple path `P`, build the object shape that
 * contains exactly that path (everything else removed). Once the tail is
 * empty we keep the leaf value verbatim.
 */
type PickByPath<T, P extends readonly string[]> = P extends readonly [
  infer Head extends string,
  ...infer Rest extends string[],
]
  ? Head extends keyof T
    ? Rest extends []
      ? { [K in Head]: T[Head] }
      : { [K in Head]: PickByPath<T[Head], Rest> }
    : never
  : T;

/**
 * Recursive prettifier: walks the (intersected) object tree and rebuilds
 * each level as a fresh object literal so the result reads as a clean
 * single shape rather than `A & B & C`. Leaves are preserved untouched.
 */
type DeepFlatten<T> = T extends Builtin
  ? T
  : T extends ReadonlyMap<unknown, unknown> | ReadonlySet<unknown>
    ? T
    : T extends ReadonlyArray<unknown>
      ? T
      : T extends object
        ? { [K in keyof T]: DeepFlatten<T[K]> }
        : T;

/** Union -> intersection (classical contravariant-position trick). */
type UnionToIntersection<U> = (
  U extends unknown ? (x: U) => void : never
) extends (x: infer I) => void
  ? I
  : never;

export type DeepPick<T, Paths extends string> = DeepFlatten<
  UnionToIntersection<
    Paths extends string ? PickByPath<T, Split<Paths>> : never
  >
>;
