type Builtin = Function | Date | Error | RegExp;
export type DeepRequired<T> = T extends Builtin ? T
  : T extends Map<infer K, infer V> ? Map<K, DeepRequired<V>>
  : T extends ReadonlyMap<infer K, infer V> ? ReadonlyMap<K, DeepRequired<V>>
  : T extends Set<infer U> ? Set<DeepRequired<U>>
  : T extends ReadonlySet<infer U> ? ReadonlySet<DeepRequired<U>>
  : T extends Promise<infer U> ? Promise<DeepRequired<U>>
  : T extends object ? { [K in keyof T]-?: DeepRequired<T[K]> }
  : T;

type Y = DeepRequired<(string | undefined)[]>;
let y: Y = [""];
// @ts-expect-error
y[0] = undefined;
