// Helper type to create readonly object
type MakeReadonlyObj<T> = {
  readonly [K in keyof T]: DeepReadonly<T[K]>;
};

// DeepReadonly<T> - Recursively makes every property readonly
// Handles objects, arrays, Maps, and Sets
export type DeepReadonly<T> = T extends ReadonlyMap<infer K, infer V>
  ? ReadonlyMap<K, DeepReadonly<V>>
  : T extends ReadonlySet<infer V>
  ? ReadonlySet<DeepReadonly<V>>
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<K, DeepReadonly<V>>
  : T extends Set<infer V>
  ? ReadonlySet<DeepReadonly<V>>
  : T extends readonly unknown[]
  ? readonly DeepReadonly<T[number]>[]
  : T extends object
  ? MakeReadonlyObj<T>
  : T;

// DeepMutable<T> - Strips readonly recursively
export type DeepMutable<T> = T extends Map<infer K, infer V>
  ? Map<K, DeepMutable<V>>
  : T extends Set<infer V>
  ? Set<DeepMutable<V>>
  : T extends readonly unknown[]
  ? { [K in keyof T]: DeepMutable<T[K]> }
  : T extends object
  ? { [K in keyof T]: DeepMutable<T[K]> }
  : T;

// DeepPartial<T> - Recursively makes properties optional
// Arrays remain arrays
export type DeepPartial<T> = T extends Map<infer K, infer V>
  ? ReadonlyMap<K, DeepPartial<V>>
  : T extends Set<infer V>
  ? ReadonlySet<DeepPartial<V>>
  : T extends readonly unknown[]
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

// DeepRequired<T> - Recursively makes properties required
export type DeepRequired<T> = T extends Map<infer K, infer V>
  ? Map<K, DeepRequired<V>>
  : T extends Set<infer V>
  ? Set<DeepRequired<V>>
  : T extends readonly unknown[]
  ? { [K in keyof T]: DeepRequired<T[K]> }
  : T extends object
  ? { [K in keyof T]: DeepRequired<T[K]> }
  : T;

// DeepPick<T, Path> - Pick deeply nested properties using dot-notation path strings
type GetNestedValue<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? GetNestedValue<T[Key], Rest>
    : never
  : Path extends keyof T
  ? T[Path]
  : never;

// Handle union paths - apply to each path in the union
type DeepPickSingle<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? DeepPickSingle<T[Key], Rest>
    : never
  : P extends keyof T
  ? T[P]
  : never;

export type DeepPick<T, Path extends string> = GetNestedValue<T, Path>;
