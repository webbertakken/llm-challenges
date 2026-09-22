import { DeepReadonly, DeepMutable, DeepPartial, DeepRequired, DeepPick } from "./types.js";

type Original = {
  a: {
    b: {
      c: number;
      d: string[];
    };
    e: Map<string, { f: boolean }>;
  };
  tupl: [string, number];
  func: () => void;
  prim: string;
};

type Part = DeepPartial<Original>;

const p1: Part = {
  a: { b: { d: ["yes"] } }
};

// @ts-expect-error
p1.a.b.d[0] = 5;

// Is tupl an optional-element tuple or a regular tuple?
// They say "Arrays should remain arrays (not turned into optional-element tuples)."
const p2: Part = {
  tupl: ["h", 1] // if it's [string?, number?] it accepts [undefined, 1].
};
