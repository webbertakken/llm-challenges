type Primitive = string | number | boolean | bigint | symbol | null | undefined;
type Builtin = Primitive | Date | RegExp | Error;
type AnyFunction = (...args: never[]) => unknown;

type IsTuple<T extends readonly unknown[]> = number extends T["length"] ? false : true;

type DeepPickOne<T, Path extends string> =
  Path extends `${infer Head}.${infer Rest}`
    ? Head extends keyof T
      ? { [Key in Head]: DeepPickOne<T[Head], Rest> }
      : unknown
    : Path extends keyof T
      ? { [Key in Path]: T[Path] }
      : unknown;

type UnionToIntersection<T> = (
  T extends unknown ? (value: T) => void : never
) extends (value: infer Intersection) => void
  ? Intersection
  : never;

type Simplify<T> = T extends object ? { [Key in keyof T]: T[Key] } : T;

export type DeepReadonly<T> =
  T extends Builtin | AnyFunction
    ? T
    : T extends ReadonlyMap<infer Key, infer Value>
      ? ReadonlyMap<DeepReadonly<Key>, DeepReadonly<Value>>
      : T extends ReadonlySet<infer Value>
        ? ReadonlySet<DeepReadonly<Value>>
        : T extends readonly unknown[]
          ? IsTuple<T> extends true
            ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
            : ReadonlyArray<DeepReadonly<T[number]>>
          : T extends object
            ? { readonly [Key in keyof T]: DeepReadonly<T[Key]> }
            : T;

export type DeepMutable<T> =
  T extends Builtin | AnyFunction
    ? T
    : T extends ReadonlyMap<infer Key, infer Value>
      ? Map<DeepMutable<Key>, DeepMutable<Value>>
      : T extends ReadonlySet<infer Value>
        ? Set<DeepMutable<Value>>
        : T extends readonly unknown[]
          ? IsTuple<T> extends true
            ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
            : DeepMutable<T[number]>[]
          : T extends object
            ? { -readonly [Key in keyof T]: DeepMutable<T[Key]> }
            : T;

export type DeepPartial<T> =
  T extends Builtin | AnyFunction
    ? T
    : T extends ReadonlyMap<infer Key, infer Value>
      ? Map<Key, DeepPartial<Value>>
      : T extends ReadonlySet<infer Value>
        ? Set<DeepPartial<Value>>
        : T extends readonly unknown[]
          ? IsTuple<T> extends true
            ? { [Key in keyof T]: DeepPartial<T[Key]> }
            : DeepPartial<T[number]>[]
          : T extends object
            ? { [Key in keyof T]?: DeepPartial<T[Key]> }
            : T;

export type DeepRequired<T> =
  T extends Builtin | AnyFunction
    ? T
    : T extends ReadonlyMap<infer Key, infer Value>
      ? Map<Key, DeepRequired<Value>>
      : T extends ReadonlySet<infer Value>
        ? Set<DeepRequired<Value>>
        : T extends readonly unknown[]
          ? IsTuple<T> extends true
            ? { [Key in keyof T]-?: DeepRequired<T[Key]> }
            : DeepRequired<T[number]>[]
          : T extends object
            ? { [Key in keyof T]-?: DeepRequired<T[Key]> }
            : T;

export type DeepPick<T, Paths extends string> = Simplify<
  UnionToIntersection<Paths extends string ? DeepPickOne<T, Paths> : never>
>;

