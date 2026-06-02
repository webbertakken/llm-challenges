/**
 * Executable specification for challenge 07.
 *
 * This is a RUNTIME normaliser for the untyped lambda calculus. It is NOT the
 * deliverable (the deliverable is a *type-level* `Normalize`). Its job is to
 * (1) define the exact semantics precisely and unambiguously, and (2) generate
 * and verify the expected outputs baked into the grader's spec.
 *
 * Semantics:
 *   - Concrete input syntax (named):
 *       term = app
 *       app  = atom atom*            (application, left-associative)
 *       atom = var | "(" term ")" | abs
 *       abs  = "\" var "." term      (body extends as far right as possible)
 *       var  = a single lowercase letter [a-z]
 *     Whitespace between tokens is insignificant.
 *   - Only CLOSED terms (no free variables) are valid inputs.
 *   - Reduction: normal order (leftmost-outermost) to beta-normal form,
 *     bounded by MAX_STEPS. If a normal form is not reached within the bound,
 *     the result is the sentinel "DIVERGE".
 *   - Output: the beta-normal form rendered in De Bruijn notation, which is
 *     canonical (alpha-equivalent terms render identically):
 *       term = "\." term            (abstraction; no bound-variable name)
 *            | "(" term " " term ")" (application; always parenthesised)
 *            | <index>              (variable; 0-based de Bruijn index)
 */

export const MAX_STEPS = 1000;

type Named =
  | { tag: "var"; name: string }
  | { tag: "abs"; param: string; body: Named }
  | { tag: "app"; fn: Named; arg: Named };

type DB =
  | { tag: "v"; index: number }
  | { tag: "lam"; body: DB }
  | { tag: "ap"; fn: DB; arg: DB };

// ----- parser ---------------------------------------------------------------

class Parser {
  private i = 0;
  constructor(private readonly s: string) {}

  private ws(): void {
    while (this.i < this.s.length && this.s[this.i] === " ") this.i++;
  }

  private peek(): string | undefined {
    this.ws();
    return this.s[this.i];
  }

  parse(): Named {
    const t = this.parseApp();
    this.ws();
    if (this.i !== this.s.length) {
      throw new Error(`unexpected trailing input at ${this.i}: ${this.s}`);
    }
    return t;
  }

  private parseApp(): Named {
    let left = this.parseAtom();
    for (;;) {
      const c = this.peek();
      if (c === undefined || c === ")" || c === ".") break;
      const right = this.parseAtom();
      left = { tag: "app", fn: left, arg: right };
    }
    return left;
  }

  private parseAtom(): Named {
    const c = this.peek();
    if (c === undefined) throw new Error("unexpected end of input");
    if (c === "\\") return this.parseAbs();
    if (c === "(") {
      this.i++; // consume "("
      const t = this.parseApp();
      this.ws();
      if (this.s[this.i] !== ")") throw new Error("expected )");
      this.i++; // consume ")"
      return t;
    }
    if (/[a-z]/.test(c)) {
      this.i++;
      return { tag: "var", name: c };
    }
    throw new Error(`unexpected character '${c}' at ${this.i}`);
  }

  private parseAbs(): Named {
    this.i++; // consume "\"
    const v = this.peek();
    if (v === undefined || !/[a-z]/.test(v)) throw new Error("expected param");
    this.i++; // consume var
    if (this.peek() !== ".") throw new Error("expected . after param");
    this.i++; // consume "."
    const body = this.parseApp();
    return { tag: "abs", param: v, body };
  }
}

// ----- de Bruijn conversion (closed terms only) -----------------------------

function toDB(t: Named, env: string[] = []): DB {
  switch (t.tag) {
    case "var": {
      const index = env.indexOf(t.name);
      if (index === -1) throw new Error(`free variable '${t.name}'`);
      return { tag: "v", index };
    }
    case "abs":
      return { tag: "lam", body: toDB(t.body, [t.param, ...env]) };
    case "app":
      return { tag: "ap", fn: toDB(t.fn, env), arg: toDB(t.arg, env) };
  }
}

// ----- shifting / substitution / reduction ----------------------------------

function shift(t: DB, d: number, cutoff: number): DB {
  switch (t.tag) {
    case "v":
      return { tag: "v", index: t.index >= cutoff ? t.index + d : t.index };
    case "lam":
      return { tag: "lam", body: shift(t.body, d, cutoff + 1) };
    case "ap":
      return { tag: "ap", fn: shift(t.fn, d, cutoff), arg: shift(t.arg, d, cutoff) };
  }
}

function subst(t: DB, j: number, s: DB): DB {
  switch (t.tag) {
    case "v":
      return t.index === j ? s : t;
    case "lam":
      return { tag: "lam", body: subst(t.body, j + 1, shift(s, 1, 0)) };
    case "ap":
      return { tag: "ap", fn: subst(t.fn, j, s), arg: subst(t.arg, j, s) };
  }
}

function betaReduce(body: DB, arg: DB): DB {
  return shift(subst(body, 0, shift(arg, 1, 0)), -1, 0);
}

/** One normal-order (leftmost-outermost) step. Returns null if in normal form. */
function step(t: DB): DB | null {
  if (t.tag === "ap") {
    if (t.fn.tag === "lam") return betaReduce(t.fn.body, t.arg);
    const f = step(t.fn);
    if (f) return { tag: "ap", fn: f, arg: t.arg };
    const a = step(t.arg);
    if (a) return { tag: "ap", fn: t.fn, arg: a };
    return null;
  }
  if (t.tag === "lam") {
    const b = step(t.body);
    return b ? { tag: "lam", body: b } : null;
  }
  return null;
}

function render(t: DB): string {
  switch (t.tag) {
    case "v":
      return String(t.index);
    case "lam":
      return `\\.${render(t.body)}`;
    case "ap":
      return `(${render(t.fn)} ${render(t.arg)})`;
  }
}

/** Parse, normalise (normal order, bounded), and render in de Bruijn form. */
export function normalize(src: string): string {
  let t = toDB(new Parser(src).parse());
  for (let n = 0; n < MAX_STEPS; n++) {
    const next = step(t);
    if (next === null) return render(t);
    t = next;
  }
  return "DIVERGE";
}
