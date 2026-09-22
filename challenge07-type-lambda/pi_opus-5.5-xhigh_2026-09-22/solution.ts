/**
 * Type-level normaliser for the untyped lambda calculus.
 *
 *   Normalize<"\\x.x">                              = "\\.0"
 *   Normalize<"(\\n.\\f.\\x.f (n f x)) (\\f.\\x.x)"> = "\\.\\.(1 0)"
 *   Normalize<"(\\x.x x) (\\x.x x)">                = "DIVERGE"
 *
 * Pipeline: Lex -> Parse (straight to de Bruijn terms) -> normal-order reduction machine with a
 * step bound -> Render.
 *
 * TypeScript lets a tail-recursive conditional type loop 1000 times, but nests non-tail evaluation
 * only about 100 levels deep. So no traversal here recurses on the shape of the term:
 * - Every traversal is a tail-recursive loop over an explicit stack or zipper.
 * - Loops that can run long are cut into chunks: a chunk either nests one level or returns to a
 *   driver loop that resumes it.
 * - Term depth is therefore irrelevant, and term size only costs time.
 */

// ---------------------------------------------------------------------------
// Terms and counters
// ---------------------------------------------------------------------------

/** A natural number in unary, used for de Bruijn indices and binder depths: 2 is [1, 1]. */
type Nat = 1[];

/**
 * A lambda term with de Bruijn indices: a variable is the number of binders between its
 * occurrence and the binder it refers to.
 *
 * Abstractions and applications also record their *scope*: how many enclosing binders the term
 * needs, i.e. 1 + its largest free index ([] when the term is closed). The smart constructors
 * `Lam` and `App` maintain it in O(1). It lets substitution skip every subterm it cannot touch.
 * `\x.\y.x` is ["lam", ["lam", ["var", [1]], [1]], []].
 */
export type Term = ["var", Nat] | ["lam", Term, Nat] | ["app", Term, Term, Nat];

type Scope<T extends Term> = T extends ["var", infer I extends Nat]
  ? [...I, 1]
  : T extends ["lam", Term, infer S extends Nat]
    ? S
    : T extends ["app", Term, Term, infer S extends Nat]
      ? S
      : never;

type Max<A extends Nat, B extends Nat> = A extends [...B, ...Nat] ? A : B;

/** An abstraction binds one level of its body's scope. */
type Lam<Body extends Term> = ["lam", Body, Scope<Body> extends [1, ...infer Outer extends Nat] ? Outer : []];
type App<F extends Term, A extends Term> = ["app", F, A, Max<Scope<F>, Scope<A>>];

type UpTo<N extends number, Table extends number[] = []> =
  Table["length"] extends N ? Table : UpTo<N, [...Table, [...Table, 0]["length"]]>;

/** `Successor[N]` is N + 1 (for N < 800): an O(1) counter, where growing a tuple would cost O(N) per tick. */
type Successor = UpTo<800>;

// ---------------------------------------------------------------------------
// 1. Lexing
// ---------------------------------------------------------------------------

type Letter =
  | "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h" | "i" | "j" | "k" | "l" | "m"
  | "n" | "o" | "p" | "q" | "r" | "s" | "t" | "u" | "v" | "w" | "x" | "y" | "z";
type Token = Letter | "\\" | "." | "(" | ")";
type Whitespace = " " | "\t" | "\n" | "\r";

type Lex<S extends string, Tokens extends Token[] = []> = S extends `${infer C}${infer Rest}`
  ? C extends Whitespace
    ? Lex<Rest, Tokens>
    : C extends Token
      ? Lex<Rest, [...Tokens, C]>
      : "error"
  : Tokens;

// ---------------------------------------------------------------------------
// 2. Parsing: shift-reduce straight into de Bruijn form
//
//   term = app;  app = atom atom*;  atom = var | "(" term ")" | abs;  abs = "\" var "." term
//
// The parser keeps a stack of open frames (innermost first). Each frame holds the application
// it has built so far. An abstraction frame stays open until the ")" or end of input that
// closes its enclosing group, which is exactly "the body extends as far right as possible".
// ---------------------------------------------------------------------------

type Partial = Term | null;
type Frame = ["root", Partial] | ["group", Partial] | ["lam", Letter, Partial];

/** Appends an atom to an application under construction (left-associative). */
type Extend<P extends Partial, Atom extends Term> = P extends Term ? App<P, Atom> : Atom;

type AddAtom<Stack extends Frame[], Atom extends Term> =
  Stack extends [["lam", infer Name extends Letter, infer P extends Partial], ...infer Rest extends Frame[]]
    ? [["lam", Name, Extend<P, Atom>], ...Rest]
    : Stack extends [[infer Kind extends "root" | "group", infer P extends Partial], ...infer Rest extends Frame[]]
      ? [[Kind, Extend<P, Atom>], ...Rest]
      : "error";

/** The de Bruijn index of `Name`: how many abstraction frames lie above the one that binds it. */
type IndexOf<Name extends Letter, Stack extends Frame[], Index extends Nat = []> =
  Stack extends [infer Top extends Frame, ...infer Rest extends Frame[]]
    ? Top extends ["lam", infer Bound extends Letter, Partial]
      ? Bound extends Name
        ? Index
        : IndexOf<Name, Rest, [...Index, 1]>
      : IndexOf<Name, Rest, Index>
    : "error"; // free variable: inputs must be closed

/** Closes every abstraction up to the innermost group, then the group itself (on ")"). */
type CloseGroup<Stack extends Frame[]> =
  Stack extends [["lam", Letter, infer Body extends Term], ...infer Rest extends Frame[]]
    ? AddAtom<Rest, Lam<Body>> extends infer Next extends Frame[]
      ? CloseGroup<Next>
      : "error"
    : Stack extends [["group", infer Inner extends Term], ...infer Rest extends Frame[]]
      ? AddAtom<Rest, Inner>
      : "error"; // unbalanced ")", or an empty group or body

/** Closes the remaining abstractions at the end of input; the root then holds the whole term. */
type Finish<Stack extends Frame[]> =
  Stack extends [["lam", Letter, infer Body extends Term], ...infer Rest extends Frame[]]
    ? AddAtom<Rest, Lam<Body>> extends infer Next extends Frame[]
      ? Finish<Next>
      : "error"
    : Stack extends [["root", infer Whole extends Term]]
      ? Whole
      : "error"; // unclosed "(", or empty input

type ParseTokens<Tokens extends Token[], Stack extends Frame[] = [["root", null]]> =
  Tokens extends ["\\", infer Name extends Letter, ".", ...infer Rest extends Token[]]
    ? ParseTokens<Rest, [["lam", Name, null], ...Stack]>
    : Tokens extends ["(", ...infer Rest extends Token[]]
      ? ParseTokens<Rest, [["group", null], ...Stack]>
      : Tokens extends [")", ...infer Rest extends Token[]]
        ? CloseGroup<Stack> extends infer Next extends Frame[]
          ? ParseTokens<Rest, Next>
          : "error"
        : Tokens extends [infer Name extends Letter, ...infer Rest extends Token[]]
          ? IndexOf<Name, Stack> extends infer Index extends Nat
            ? AddAtom<Stack, ["var", Index]> extends infer Next extends Frame[]
              ? ParseTokens<Rest, Next>
              : "error"
            : "error"
          : Tokens extends []
            ? Finish<Stack>
            : "error";

/** Parses named lambda syntax into a de Bruijn term, or "error". */
export type Parse<S extends string> = Lex<S> extends infer Tokens extends Token[] ? ParseTokens<Tokens> : "error";

// ---------------------------------------------------------------------------
// 3. Rewriting: shifting and capture-avoiding substitution
//
// Both are the same traversal: visit every variable, knowing how many binders (Depth) of the
// rewritten term enclose it, and rebuild the tree bottom-up. The traversal is a loop over a work
// stack (subterms to visit, nodes to reassemble) and a stack of finished subterms.
//
// Both rules only touch variables that point outside the rewritten term (index >= Depth). A
// subterm whose scope fits within Depth is therefore reused as is, without being visited. Closed
// arguments, in particular, are never copied or shifted.
// ---------------------------------------------------------------------------

type Rule =
  | ["shift", Nat] // add the amount to every variable that is free in the rewritten term
  | ["substitute", Term]; // replace variable 0 by the argument, then drop the binder it referred to

type RewriteVar<I extends Nat, Depth extends Nat, R extends Rule> =
  R extends ["shift", infer Amount extends Nat]
    ? I extends [...Depth, ...Nat]
      ? ["var", [...I, ...Amount]]
      : ["var", I]
    : R extends ["substitute", infer Arg extends Term]
      ? I extends Depth
        ? Rewrite<Arg, ["shift", Depth]> // the argument moves under Depth binders: shift its free variables
        : I extends [...Depth, 1, ...infer Excess extends Nat]
          ? ["var", [...Depth, ...Excess]] // free beyond the removed binder: one binder fewer now
          : ["var", I] // bound inside the body: unchanged
      : never;

type Work = ["visit", Term, Nat] | ["lam"] | ["app"];
/** Stacks are linked lists (top first), so push and pop stay O(1) however deep the term is. */
type WorkStack = [Work, WorkStack] | [];
type TermStack = [Term, TermStack] | [];

/** Iterations per chunk; after a chunk the loop continues one nesting level deeper. */
type REWRITE_CHUNK = 500;

type RewriteLoop<Todo extends WorkStack, Done extends TermStack, R extends Rule, Hops extends number = 0> =
  Hops extends REWRITE_CHUNK
    ? RewriteLoop<Todo, Done, R> extends infer Result extends Term
      ? Result
      : never
    : Todo extends [infer Item extends Work, infer Rest extends WorkStack]
      ? Item extends ["visit", infer T extends Term, infer Depth extends Nat]
        ? Scope<T> extends [...Depth, 1, ...Nat]
          ? T extends ["var", infer I extends Nat]
            ? RewriteVar<I, Depth, R> extends infer Replacement extends Term
              ? RewriteLoop<Rest, [Replacement, Done], R, Successor[Hops]>
              : never
            : T extends ["lam", infer Body extends Term, Nat]
              ? RewriteLoop<[["visit", Body, [...Depth, 1]], [["lam"], Rest]], Done, R, Successor[Hops]>
              : T extends ["app", infer F extends Term, infer A extends Term, Nat]
                ? RewriteLoop<[["visit", F, Depth], [["visit", A, Depth], [["app"], Rest]]], Done, R, Successor[Hops]>
                : never
          : RewriteLoop<Rest, [T, Done], R, Successor[Hops]> // out of the rule's reach: reuse
        : Item extends ["lam"]
          ? Done extends [infer Body extends Term, infer Below extends TermStack]
            ? RewriteLoop<Rest, [Lam<Body>, Below], R, Successor[Hops]>
            : never
          : Done extends [infer A extends Term, [infer F extends Term, infer Below extends TermStack]]
            ? RewriteLoop<Rest, [App<F, A>, Below], R, Successor[Hops]>
            : never
      : Done extends [infer Result extends Term, []]
        ? Result
        : never;

type Rewrite<T extends Term, R extends Rule> = R extends ["shift", []] ? T : RewriteLoop<[["visit", T, []], []], [], R>;

/** Beta-contraction of `(\. Body) Arg`. */
type Contract<Body extends Term, Arg extends Term> = Rewrite<Body, ["substitute", Arg]>;

// ---------------------------------------------------------------------------
// 4. The normal-order reduction machine
//
// A zipper walk in leftmost-outermost order. Descending into an application, it first checks
// for a redex, then searches the function, then the argument; breadcrumbs record the way back.
//
// After a contraction the walk resumes at the reduct instead of restarting from the root:
// - Everything to its left is already normal.
// - The only enclosing node that can have become a redex is the parent application, when the
//   reduct sits in its function position.
// Ascending past the root means no redex is left, and the rebuilt term is the normal form.
// ---------------------------------------------------------------------------

type Crumb =
  | ["lam"] // inside an abstraction body
  | ["fun", Term] // inside the function of an application; holds the argument
  | ["arg", Term]; // inside the argument of an application; holds the (normal) function

/** The way back to the root as a linked list (innermost crumb first): O(1) push and pop at any depth. */
type Path = [Crumb, Path] | [];

type MachineState = ["descend", Term, Path] | ["ascend", Term, Path];

/** Where to continue after a contraction: at the parent application if the reduct is its function. */
type Resume<Reduct extends Term, Way extends Path> =
  Way extends [["fun", infer A extends Term], infer Rest extends Path]
    ? ["descend", App<Reduct, A>, Rest]
    : ["descend", Reduct, Way];

/** Beta-steps per round; the step bound is STEPS_PER_ROUND * ROUNDS = 10,000. */
type STEPS_PER_ROUND = 400;
type ROUNDS = 25;
/** Machine transitions per call before it hands its state back to the driver. */
type HOPS_PER_CALL = 800;

type Outcome =
  | ["normal", Term]
  | ["paused", MachineState, number] // out of transitions for this call; carries the round's step count
  | ["round done", MachineState]; // the round's steps are used up

type Machine<State extends MachineState, Steps extends number, Hops extends number = 0> =
  Hops extends HOPS_PER_CALL
    ? ["paused", State, Steps]
    : State extends ["descend", infer Focus extends Term, infer Way extends Path]
      ? Focus extends ["app", infer F extends Term, infer A extends Term, Nat]
        ? F extends ["lam", infer Body extends Term, Nat]
          ? Steps extends STEPS_PER_ROUND
            ? ["round done", State]
            : Contract<Body, A> extends infer Reduct extends Term
              ? Machine<Resume<Reduct, Way>, Successor[Steps], Successor[Hops]>
              : never
          : Machine<["descend", F, [["fun", A], Way]], Steps, Successor[Hops]>
        : Focus extends ["lam", infer Body extends Term, Nat]
          ? Machine<["descend", Body, [["lam"], Way]], Steps, Successor[Hops]>
          : Machine<["ascend", Focus, Way], Steps, Successor[Hops]>
      : State extends ["ascend", infer Finished extends Term, infer Way extends Path]
        ? Way extends [infer Top extends Crumb, infer Rest extends Path]
          ? Top extends ["fun", infer A extends Term]
            ? Machine<["descend", A, [["arg", Finished], Rest]], Steps, Successor[Hops]>
            : Top extends ["arg", infer F extends Term]
              ? Machine<["ascend", App<F, Finished>, Rest], Steps, Successor[Hops]>
              : Machine<["ascend", Lam<Finished>, Rest], Steps, Successor[Hops]>
          : ["normal", Finished]
        : never;

/** Runs the machine call after call, counting rounds of beta-steps against the bound. */
type Drive<State extends MachineState, Steps extends number = 0, Round extends 1[] = []> =
  Machine<State, Steps> extends infer Result extends Outcome
    ? Result extends ["normal", infer NormalForm extends Term]
      ? Render<NormalForm>
      : Result extends ["paused", infer Next extends MachineState, infer Used extends number]
        ? Drive<Next, Used, Round>
        : Result extends ["round done", infer Next extends MachineState]
          ? [...Round, 1]["length"] extends ROUNDS
            ? "DIVERGE"
            : Drive<Next, 0, [...Round, 1]>
          : never
    : never;

// ---------------------------------------------------------------------------
// 5. Rendering canonical de Bruijn syntax
// ---------------------------------------------------------------------------

type RENDER_CHUNK = 500;

type RenderStack = [Term | string, RenderStack] | [];

type RenderLoop<Todo extends RenderStack, Out extends string = "", Hops extends number = 0> =
  Hops extends RENDER_CHUNK
    ? RenderLoop<Todo, Out> extends infer Result extends string
      ? Result
      : never
    : Todo extends [infer Item, infer Rest extends RenderStack]
      ? Item extends string
        ? RenderLoop<Rest, `${Out}${Item}`, Successor[Hops]>
        : Item extends ["var", infer I extends Nat]
          ? RenderLoop<Rest, `${Out}${I["length"]}`, Successor[Hops]>
          : Item extends ["lam", infer Body extends Term, Nat]
            ? RenderLoop<[Body, Rest], `${Out}\\.`, Successor[Hops]>
            : Item extends ["app", infer F extends Term, infer A extends Term, Nat]
              ? RenderLoop<[F, [" ", [A, [")", Rest]]]], `${Out}(`, Successor[Hops]>
              : never
      : Out;

/** `\.` for an abstraction, `(f a)` for an application, the decimal index for a variable. */
export type Render<T extends Term> = RenderLoop<[T, []]>;

// ---------------------------------------------------------------------------
// The normaliser
// ---------------------------------------------------------------------------

/** The beta-normal form of a closed lambda term, in canonical de Bruijn syntax, or "DIVERGE". */
export type Normalize<S extends string> = Parse<S> extends infer T extends Term ? Drive<["descend", T, []]> : never;
