import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { foldedPositions } from '../src/fold/fold';
import { loadModel } from '../src/fold/load-model';
import { unfoldAll } from '../src/home/unfold';
import { buildFold, entryOf } from './build';
import { checkModel } from './check';
import { DEFAULT_MODEL, FIXTURES, sources } from './src/index';
import { thumbnail } from './thumbnail';

const committed = (path: string) =>
  JSON.parse(readFileSync(new URL(`../public/models/${path}`, import.meta.url), 'utf8'));

/** A committed file with every number matched within 0.05: the solver's last digits differ between CPUs (CI is
 * x64), and can tip an unfold angle rounded to 0.01. */
const near = (path: string) =>
  JSON.parse(readFileSync(new URL(`../public/models/${path}`, import.meta.url), 'utf8'), (_, v) =>
    typeof v === 'number' ? expect.closeTo(v, 1) : v
  );

describe.each(sources.map((s) => [s.id, s] as const))('%s', (_, src) => {
  const built = buildFold(src);

  it('passes every check', () => {
    expect(checkModel(loadModel(built))).toEqual([]);
  });

  it('opens out all at once without tearing', () => {
    // ponytail: layers may pass through each other (the crane's do, briefly); only the joins are held
    const tears = checkModel(unfoldAll(loadModel(built))).filter((p) => !p.includes('pass through'));
    expect(tears).toEqual([]);
  });

  it('is committed as built (run pnpm models)', () => {
    expect(JSON.parse(JSON.stringify(built))).toEqual(near(`${src.id}.fold`));
    const svg = readFileSync(new URL(`../public/models/${src.id}.svg`, import.meta.url), 'utf8');
    expect(svg).toBe(thumbnail(loadModel(built)));
  });

  it('has a Portuguese name and instructions', () => {
    expect(src.name.pt).toBeTruthy();
    for (const step of src.steps) expect(step.pt.trim()).not.toBe('');
  });
});

describe('models.json', () => {
  it('lists every authored model, then the fixtures, and opens a listed default', () => {
    const index = committed('models.json');
    expect(index.models).toEqual(JSON.parse(JSON.stringify([...sources.map(entryOf), ...FIXTURES])));
    expect(index.models.map((m: { id: string }) => m.id)).toContain(DEFAULT_MODEL);
  });
});

describe('crane', () => {
  it('reverse-folds the neck and the tail up inside the body, between its layers', () => {
    const model = loadModel(committed('crane.fold'));
    const inside = ([x, y]: number[], poly: number[][]) => {
      let c = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++)
        if (
          poly[i][1] > y !== poly[j][1] > y &&
          x < ((poly[j][0] - poly[i][0]) * (y - poly[i][1])) / (poly[j][1] - poly[i][1]) + poly[i][0]
        )
          c = !c;
      return c;
    };
    for (const step of [16, 17]) {
      const [was, now] = [foldedPositions(model, step - 1, 1), foldedPositions(model, step, 1)];
      const moved = now.flatMap((f, i) =>
        f.some((p, j) => Math.hypot(p[0] - was[i][j][0], p[1] - was[i][j][1]) > 1e-3) ? [i] : []
      );
      const z = (f: number) => now[f].reduce((a, p) => a + p[2], 0) / now[f].length;
      for (const f of moved) {
        const c = [0, 1].map((j) => now[f].reduce((a, p) => a + p[j], 0) / now[f].length);
        const here = now.flatMap((face, g) => (inside(c, face) ? [g] : [])).sort((a, b) => z(b) - z(a));
        const body = here.map((g) => !moved.includes(g));
        // where the flap meets the body: body layers above it and below it, the flap's layers together
        if (!body.some(Boolean)) continue;
        const [first, last] = [body.indexOf(false), body.lastIndexOf(false)];
        expect(body.slice(first, last + 1).every((b) => !b)).toBe(true);
        expect([body[0], body.at(-1)]).toEqual([true, true]);
      }
    }
  });
});
