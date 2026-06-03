/**
 * Recursive utility types operating on arbitrarily nested structures.
 *
 * Everything here is type-level only — there is no runtime code. Correctness
 * is proven at compile time in `tests.ts` via exact type-equality checks and
 * `// @ts-expect-error` assertions.
 *
 * Design notes
 * ------------
 * - Detection order matters. Functions, Maps and Sets are all `object`s, so
 *   they must be matched *before* the generic mapped-type branch, otherwise a
 *   `Map` would be mapped over its own methods and lose its identity.
 * - Arrays and tuples are handled by homomorphic mapped types
 *   (`{ [K in keyof T]: ... }`). TypeScript special-cases these so the array
 *   stays an array and a tuple stays a tuple, with each element recursed into.
 * - `DeepPartial` / `DeepRequired` give arrays an explicit branch so that the
 *   optional modifier is applied to *object properties only*, never smeared
 *   across array elements (an array stays an array of partial elements rather
 *   than becoming `(T | undefined)[]`).
 *
 * Circular reference awareness
 * ----------------------------
 * Self-referential *named* types (e.g. `interface Node { next: Node }`) are
 * supported: TypeScript instantiates the recursive reference lazily, so a tree
 * or linked-list shape resolves fine (see `tests.ts`). The hard limit is
 * TypeScript's own instantiation-depth guard (~50 levels): a type whose
 * expansion never reaches a fixed point will raise
 * "Type instantiation is excessively deep and possibly infinite" rather than
 * loop forever. These utilities do not add their own depth cap.
 */

/** Leaf values that recursion should stop at and return verbatim. */
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

/**
 * Matches any callable. Using `never[]` params and an `unknown` return keeps
 * this `any`-free while still being assignable-from every function type
 * (parameters are contravariant, so `never[]` accepts any concrete signature).
 */
type AnyFunction = (...args: never[]) => unknown;

/* -------------------------------------------------------------------------- */
/* 1. DeepReadonly                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Recursively marks every property, array element, Map and Set as `readonly`.
 * Primitives, `null`, `undefined` and functions pass through untouched.
 */
export type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T extends ReadonlySet<infer U>
        ? ReadonlySet<DeepReadonly<U>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

/* -------------------------------------------------------------------------- */
/* 2. DeepMutable                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Inverse of {@link DeepReadonly}: strips `readonly` from every property,
 * array, Map and Set, recursively.
 */
export type DeepMutable<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends ReadonlyMap<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T extends ReadonlySet<infer U>
        ? Set<DeepMutable<U>>
        : T extends object
          ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
          : T;

/* -------------------------------------------------------------------------- */
/* 3. DeepPartial                                                             */
/* -------------------------------------------------------------------------- */

/**
 * Recursively makes every object property optional. Arrays stay arrays (an
 * array of `DeepPartial` elements) and tuples stay tuples — neither is turned
 * into an optional-element shape. Map/Set containers keep their mutability and
 * recurse into their key/value types.
 */
export type DeepPartial<T> = T extends Primitive
  ? T
  : T extends AnyFunction
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
              : T extends object
                ? { [K in keyof T]?: DeepPartial<T[K]> }
                : T;

/* -------------------------------------------------------------------------- */
/* 4. DeepRequired                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Inverse of {@link DeepPartial}: recursively strips the optional modifier
 * from every object property. Arrays, tuples and Map/Set containers are
 * recursed into while keeping their structure.
 */
export type DeepRequired<T> = T extends Primitive
  ? T
  : T extends AnyFunction
    ? T
    : T extends Map<infer K, infer V>
      ? Map<DeepRequired<K>, DeepRequired<V>>
      : T extends ReadonlyMap<infer K, infer V>
        ? ReadonlyMap<DeepRequired<K>, DeepRequired<V>>
        : T extends Set<infer U>
          ? Set<DeepRequired<U>>
          : T extends ReadonlySet<infer U>
            ? ReadonlySet<DeepRequired<U>>
            : T extends readonly unknown[]
              ? { [K in keyof T]: DeepRequired<T[K]> }
              : T extends object
                ? { [K in keyof T]-?: DeepRequired<T[K]> }
                : T;

/* -------------------------------------------------------------------------- */
/* 5. DeepPick                                                                */
/* -------------------------------------------------------------------------- */

/** First segment of a dot path: `"a.b.c"` -> `"a"`, `"a"` -> `"a"`. */
type Head<P extends string> = P extends `${infer H}.${string}` ? H : P;

/**
 * Tails of every path in `Paths` that begins with `${K}.`.
 * Distributes over the union, so `"a.b" | "a.c" | "x"` with `K = "a"`
 * collapses to `"b" | "c"`.
 */
type TailsFor<Paths extends string, K extends string> =
  Paths extends `${K}.${infer R}` ? R : never;

/**
 * Pick deeply nested properties out of `T` using dot-notation path strings.
 *
 * @example
 * type Picked = DeepPick<Original, "a.b.c" | "a.e">;
 * // => { a: { b: { c: number }; e: Map<string, { f: boolean }> } }
 *
 * Resolution rules:
 * - Paths are grouped by their first segment ({@link Head}), so siblings under
 *   the same branch merge into a single nested object (no intersection noise).
 * - A "leaf" path (a path that names a property exactly) selects that whole
 *   subtree. If a path is both a leaf and a branch prefix (e.g. `"a"` together
 *   with `"a.b"`), the broader leaf wins and the whole subtree is kept.
 */
export type DeepPick<T, Paths extends string> = {
  [K in Head<Paths> & keyof T]: K extends string
    ? K extends Paths
      ? T[K]
      : DeepPick<T[K], TailsFor<Paths, K>>
    : T[K];
};
