// ─────────────────────────────────────────────
// Challenge 01 — Deep Readonly & Recursive Utility Types
// ─────────────────────────────────────────────

// ── Helpers ──────────────────────────────────

/** Detect primitive / non-object types that should pass through unchanged. */
type IsPrimitive<T> = T extends null | undefined | string | number | boolean | symbol | bigint
  ? true
  : T extends (...args: never[]) => unknown
    ? true
    : false;

/** Preserve tuple structure: map each element through a utility recursively. */
type DeepReadonlyTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? readonly [DeepReadonly<Head>, ...DeepReadonlyTuple<Tail>]
  : T extends readonly []
    ? readonly []
    : readonly [];

type DeepMutableTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? [DeepMutable<Head>, ...DeepMutableTuple<Tail>]
  : T extends readonly []
    ? []
    : [];

type DeepPartialTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? [DeepPartial<Head>, ...DeepPartialTuple<Tail>]
  : T extends readonly []
    ? []
    : [];

type DeepRequiredTuple<T extends readonly unknown[]> = T extends readonly [
  infer Head,
  ...infer Tail,
]
  ? [DeepRequired<Head>, ...DeepRequiredTuple<Tail>]
  : T extends readonly []
    ? []
    : [];

// ── 1. DeepReadonly<T> ──────────────────────

export type DeepReadonly<T> = IsPrimitive<T> extends true
  ? T
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends Set<infer E>
      ? ReadonlySet<DeepReadonly<E>>
      : T extends readonly (infer E)[]
        ? T extends readonly [unknown, ...unknown[]]
          ? DeepReadonlyTuple<T>
          : ReadonlyArray<DeepReadonly<E>>
        : T extends object
          ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
          : T;

// ── 2. DeepMutable<T> ───────────────────────

export type DeepMutable<T> = IsPrimitive<T> extends true
  ? T
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<DeepMutable<K>, DeepMutable<V>>
    : T extends ReadonlySet<infer E>
      ? Set<DeepMutable<E>>
      : T extends (infer E)[]
        ? T extends [unknown, ...unknown[]]
          ? DeepMutableTuple<T>
          : Array<DeepMutable<E>>
        : T extends object
          ? { -readonly [K in keyof T]: DeepMutable<T[K]> }
          : T;

// ── 3. DeepPartial<T> ───────────────────────

export type DeepPartial<T> = IsPrimitive<T> extends true
  ? T
  : T extends Map<infer K, infer V>
    ? Map<DeepPartial<K>, DeepPartial<V>>
    : T extends Set<infer E>
      ? Set<DeepPartial<E>>
      : T extends (infer E)[]
        ? T extends [unknown, ...unknown[]]
          ? DeepPartialTuple<T>
          : Array<DeepPartial<E>>
        : T extends object
          ? { [K in keyof T]?: DeepPartial<T[K]> }
          : T;

// ── 4. DeepRequired<T> ──────────────────────

export type DeepRequired<T> = IsPrimitive<T> extends true
  ? T
  : T extends Map<infer K, infer V>
    ? Map<DeepRequired<K>, DeepRequired<V>>
    : T extends Set<infer E>
      ? Set<DeepRequired<E>>
      : T extends (infer E)[]
        ? T extends [unknown, ...unknown[]]
          ? DeepRequiredTuple<T>
          : Array<DeepRequired<E>>
        : T extends object
          ? { [K in keyof T]-?: DeepRequired<T[K]> }
          : T;

// ── 5. DeepPick<T, Paths> ───────────────────

/** Split a dot-notation path string into a tuple of keys. */
type SplitPath<S extends string> = S extends `${infer Head}.${infer Tail}`
  ? [Head, ...SplitPath<Tail>]
  : [S];

/** Build a path-map from a union of dot-notation paths. */
type PathMap<Paths extends string> = {
  [P in Paths as SplitPath<P>[0]]: SplitPath<P> extends [string]
    ? never
    : PathMap<
        Extract<
          Paths,
          `${SplitPath<P>[0]}.${string}`
        > extends infer Rest
          ? Rest extends string
            ? Rest extends `${string}.${infer Tail}`
              ? Tail
              : never
            : never
          : never
        >
};

/** Reconstruct an object type from a path-map. */
type Rebuild<M, T> = M extends Record<string, infer _SubPaths>
  ? {
      [K in keyof M]: M[K] extends never
        ? K extends keyof T
          ? T[K]
          : never
        : Rebuild<M[K], K extends keyof T ? T[K] : never>;
    }
  : never;

export type DeepPick<T, Paths extends string> = Rebuild<PathMap<Paths>, T>;
