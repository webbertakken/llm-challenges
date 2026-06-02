/**
 * DeepReadonly<T> - Recursively makes every property in T readonly,
 * including nested objects, arrays, Maps, and Sets.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends Function
    ? T[P]
    : T[P] extends Map<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
      : T[P] extends Set<infer V>
        ? ReadonlySet<DeepReadonly<V>>
        : T[P] extends Array<infer V>
          ? Array<DeepReadonly<V>>
          : T[P] extends object
            ? DeepReadonly<T[P]>
            : T[P];
};

/**
 * DeepMutable<T> - Strips readonly recursively from every property,
 * array, Map, and Set.
 */
export type DeepMutable<T> = {
  [P in keyof T]: T[P] extends Function
    ? T[P]
    : T[P] extends Map<infer K, infer V>
      ? Map<DeepMutable<K>, DeepMutable<V>>
      : T[P] extends Set<infer V>
        ? Set<DeepMutable<V>>
        : T[P] extends Array<infer V>
          ? DeepMutable<V>[]
          : T[P] extends object
            ? DeepMutable<T[P]>
            : T[P];
};

/**
 * DeepPartial<T> - Recursively makes every property optional,
 * including nested objects. Arrays remain arrays (not optional-element tuples).
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends Function
    ? T[P]
    : T[P] extends Map<infer K, infer V>
      ? ReadonlyMap<DeepPartial<K>, DeepPartial<V>>
      : T[P] extends Set<infer V>
        ? ReadonlySet<DeepPartial<V>>
        : T[P] extends Array<infer V>
          ? Array<DeepPartial<V>>
          : T[P] extends object
            ? DeepPartial<T[P]>
            : T[P] | undefined;
};

/**
 * DeepRequired<T> - The inverse of DeepPartial. Makes all properties required.
 */
export type DeepRequired<T> = {
  [P in keyof T]: T[P] extends Function
    ? T[P]
    : T[P] extends Map<infer K, infer V>
      ? Map<DeepRequired<K>, DeepRequired<V>>
      : T[P] extends Set<infer V>
        ? Set<DeepRequired<V>>
        : T[P] extends Array<infer V>
          ? DeepRequired<V>[]
          : T[P] extends object
            ? DeepRequired<T[P]>
            : T[P];
};

/**
 * DeepPickValue - Recursively extracts a property at a dot-separated path.
 */
type DeepPickValue<T, Path extends string> = Path extends `${infer Key}.${infer Rest}`
  ? T extends { [K in Key]?: infer Value }
    ? DeepPickValue<Value, Rest>
    : never
  : T extends { [K in Path]?: infer Value }
    ? Value
    : T extends { [K in Path]: infer Value }
      ? Value
      : never;

/**
 * DeepPick<T, Paths> - Pick deeply nested properties using dot-notation path strings.
 * Paths are strings like "a.b.c" or "a.e" and can be a union of paths.
 * Returns an object where keys are the full path strings.
 */
export type DeepPick<T, Paths extends string> = {
  [P in Paths]: DeepPickValue<T, P>;
};
