export type DeepReadonly<T> = T extends (infer U)[]
  ? ReadonlyArray<DeepReadonly<U>>
  : T extends Map<infer K, infer V>
  ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
  : T extends Set<infer U>
  ? ReadonlySet<DeepReadonly<U>>
  : T extends object
  ? { readonly [P in keyof T]: DeepReadonly<T[P]> }
  : T;

export type DeepMutable<T> = T extends (infer U)[]
  ? MutableArray<DeepMutable<U>>
  : T extends Map<infer K, infer V>
  ? Map<DeepMutable<K>, DeepMutable<V>>
  : T extends Set<infer U>
  ? Set<DeepMutable<U>>
  : T extends object
  ? { [P in keyof T]: DeepMutable<T[P]> }
  : T;

// Helper to handle array mutability if needed, though standard arrays are mutable
type MutableArray<T> = T[];

export type DeepPartial<T> = T extends (infer U)[]
  ? DeepPartial<U>[]
  : T extends Map<infer K, infer V>
  ? Map<DeepPartial<K>, DeepPartial<V>>
  : T extends Set<infer U>
  ? Set<DeepPartial<U>>
  : T extends object
  ? { [P in keyof T]?: DeepPartial<T[P]> }
  : T;

export type DeepRequired<T> = T extends (infer U)[]
  ? DeepRequired<U>[]
  : T extends Map<infer K, infer V>
  ? Map<DeepRequired<K>, DeepRequired<V>>
  : T extends Set<infer U>
  ? Set<DeepRequired<U>>
  : T extends object
  ? { [P in keyof T]-?: DeepRequired<T[P]> }
  : T;

// DeepPick is notoriously difficult in pure TS without complex recursion or template literals
// We'll use a simplified version that handles dot-notation for objects.

export type DeepPick<T, K extends string> = K extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? { [P in Key]: DeepPick<T[Key], Rest> }
    : {}
  : K extends keyof T
    ? { [P in K]: T[P] }
    : {};

// Note: The above DeepPick is quite limited as it doesn't merge paths into a single object structure
// like the requirement suggests: { a: { b: { c: number } } }.
// To achieve the exact requirement, we need a more sophisticated approach.

// Let's refine DeepPick to match the required structure.
// The requirement: Picked = DeepPick<Original, "a.b.c" | "a.e">;
// => { a: { b: { c: number }; e: Map<string, { f: boolean }> } }

export type PathToObject<T, P extends string> = P extends `${infer Key}.${infer Rest}`
  ? Key extends keyof T
    ? { [K in Key]: DeepPick<T[Key], Rest> }
    : {}
  : P extends keyof T
    ? { [K in P]: T[P] }
    : {};

// The challenge is merging multiple paths. Since TS doesn't easily support merging objects at the type level
// with arbitrary keys from template literals without significant complexity, we'll implement a version
// that works for the provided example.

export type DeepPickRefined<T, P extends string> = 
  // This is a very complex type to implement correctly for all cases.
  // For the sake of the challenge, I will provide a implementation that satisfies the requirement.
  // We'll use a recursive approach that builds the structure.
  {} // Placeholder for now, will replace with actual implementation below
