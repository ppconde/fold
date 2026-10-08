import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadModel } from '../src/fold/load-model';
import { unfoldAll } from '../src/home/unfold';
import { buildFold, entryOf } from './build';
import { checkModel } from './check';
import { DEFAULT_MODEL, FIXTURES, sources } from './src/index';
import { thumbnail } from './thumbnail';

const committed = (path: string) =>
  JSON.parse(readFileSync(new URL(`../public/models/${path}`, import.meta.url), 'utf8'));

/** `x` with every number matched to 4 decimals: the solver's last digits differ between CPUs (CI is x64). */
const near = (x: unknown): unknown =>
  typeof x === 'number'
    ? expect.closeTo(x, 4)
    : Array.isArray(x)
      ? x.map(near)
      : x && typeof x === 'object'
        ? Object.fromEntries(Object.entries(x).map(([k, v]) => [k, near(v)]))
        : x;

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
    expect(JSON.parse(JSON.stringify(built))).toEqual(near(committed(`${src.id}.fold`)));
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
