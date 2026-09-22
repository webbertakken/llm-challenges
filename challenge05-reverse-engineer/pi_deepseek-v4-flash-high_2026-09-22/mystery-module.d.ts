/**
 * The challenge ships `mystery.mjs` as plain, deliberately untyped JavaScript.
 * This shim gives the type checker the one thing it needs — the shape of the
 * default export — without touching the challenge file. The runtime never sees
 * it; `equivalence.test.ts` pulls it in with a triple-slash reference.
 */
declare module "*.mjs" {
  const mystery: (input: string) => string;
  export default mystery;
}
