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
    expect(committed(`${src.id}.fold`)).toEqual(JSON.parse(JSON.stringify(built)));
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
