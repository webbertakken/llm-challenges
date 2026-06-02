// Type-level lambda calculus normalizer
// Implements normal-order reduction with de Bruijn indices

// AST: abs body, app left right, var idx
type AST = { kind: 'abs'; body: string } | { kind: 'app'; left: string; right: string } | { kind: 'var'; idx: number };

// ============================================================================
// Parser
// ============================================================================

// Trim whitespace
type Trim<S extends string> = S extends `${' '}${infer R}` ? Trim<R> : S;

// Parse: \x.term -> abs, (l r) -> app, var -> var
type Parse<S extends string> = 
  Trim<S> extends `${'\\'}${infer _}${'.'}${infer Body}`
    ? { kind: 'abs'; body: Body }
    : Trim<S> extends `(${infer L} ${infer R})`
      ? { kind: 'app'; left: L; right: R }
      : Trim<S>;

// ============================================================================
// De Bruijn conversion
// ============================================================================

// var -> n, abs -> \.body, app -> (a b)
type ToDB<S extends string> = 
  S extends { kind: 'var'; idx: infer N extends number }
    ? `${N}`
    : S extends { kind: 'abs'; body: infer B extends string }
      ? `\\.${ToDB<B>}`
      : S extends { kind: 'app'; left: infer L; right: infer R }
        ? `(${ToDB<L> ${ToDB<R>}})`
        : '';

// ============================================================================
// Substitution
// ============================================================================

// Replace var n with term t in AST
type Subst<S extends string, N extends number, T extends string> = 
  S extends { kind: 'abs'; body: infer B }
    ? { kind: 'abs'; body: Subst<B, N, T> }
    : S extends { kind: 'app'; left: infer L; right: infer R }
      ? { kind: 'app'; left: Subst<L, N, T>; right: Subst<R, N, T> }
      : S extends `${N}`
        ? T
        : S;

// ============================================================================
// Beta reduction
// ============================================================================

// (λx. body) arg → subst x with arg in body
type Beta<L extends string, R extends string> = 
  L extends { kind: 'abs'; body: infer B }
    ? Subst<B, 0, R>
    : '';

// ============================================================================
// Normal order reduction
// ============================================================================

type MaxSteps = 50;

type Reduce<T extends string, N extends number> = 
  N extends MaxSteps
    ? T
    : T extends { kind: 'app'; left: infer L; right: infer R }
      ? L extends { kind: 'abs'; body: infer _ }
        ? Beta<L, R> extends infer B2
          ? Reduce<B2, N extends infer K ? K + 1 : 1>
          : T
        : Reduce<T, N extends infer K ? K + 1 : 1>
      : T;

// ============================================================================
// Main normalizer
// ============================================================================

type NormalizeImpl<S extends string> = 
  Parse<S> extends infer Parsed
    ? Parsed extends { kind: 'abs'; body: infer Body }
      ? `\\.${Body}`
      : Parsed extends { kind: 'app'; left: infer L; right: infer R }
        ? Reduce<Parsed, 0> extends infer Reduced
          ? ToDB<Reduced>
          : ''
        : ''
    : '';

export type Normalize<S extends string> = NormalizeImpl<S>;

