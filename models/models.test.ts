import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { loadModel } from '../src/fold/load-model';
import { buildFold, entryOf } from './build';
import { checkModel } from './check';
import { DEFAULT_MODEL, FIXTURES, sources } from './src/index';

const committed = (path: string) =>
  JSON.parse(readFileSync(new URL(`../public/models/${path}`, import.meta.url), 'utf8'));

describe.each(sources.map((s) => [s.id, s] as const))('%s', (_, src) => {
  it('passes every check', () => {
    expect(checkModel(loadModel(buildFold(src)))).toEqual([]);
  });

  it('is committed as built (run pnpm models)', () => {
    expect(committed(`${src.id}.fold`)).toEqual(JSON.parse(JSON.stringify(buildFold(src))));
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
