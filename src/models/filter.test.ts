import { describe, expect, it } from 'vitest';
import type { ModelEntry } from './catalog';
import { filterModels, parseLibrarySearch } from './filter';

const entry = (id: string, rest: Partial<ModelEntry>): ModelEntry => ({
  id,
  name: { en: id },
  category: 'objects',
  difficulty: 'easy',
  tags: [],
  ...rest
});
const models = [
  entry('fox-face', {
    name: { en: 'Fox face', pt: 'Cara de raposa' },
    japaneseName: 'Kitsune',
    category: 'animals',
    tags: ['animal']
  }),
  entry('tulip', { name: { en: 'Tulip', pt: 'Túlipa' }, japaneseName: 'Chūrippu', category: 'flowers' }),
  entry('kabuto', { name: { en: 'Samurai helmet', pt: 'Capacete de samurai' }, difficulty: 'medium', tags: ['helmet'] })
];
const ids = (list: ModelEntry[]) => list.map((m) => m.id);

describe('filterModels', () => {
  it('returns everything with no search', () => {
    expect(ids(filterModels(models, {}))).toEqual(['fox-face', 'tulip', 'kabuto']);
  });

  it('matches the name in either language, the Japanese name and tags', () => {
    expect(ids(filterModels(models, { q: 'fox' }))).toEqual(['fox-face']);
    expect(ids(filterModels(models, { q: 'raposa' }))).toEqual(['fox-face']);
    expect(ids(filterModels(models, { q: 'kitsune' }))).toEqual(['fox-face']);
    expect(ids(filterModels(models, { q: 'helmet' }))).toEqual(['kabuto']);
  });

  it('ignores case and accents, in the query and in the names', () => {
    expect(ids(filterModels(models, { q: 'TULIPA' }))).toEqual(['tulip']);
    expect(ids(filterModels(models, { q: 'chūrippu' }))).toEqual(['tulip']);
    expect(ids(filterModels(models, { q: 'churippu' }))).toEqual(['tulip']);
  });

  it('needs every word to match', () => {
    expect(ids(filterModels(models, { q: 'samurai helmet' }))).toEqual(['kabuto']);
    expect(ids(filterModels(models, { q: 'samurai fox' }))).toEqual([]);
  });

  it('applies each filter alone and together with the query', () => {
    expect(ids(filterModels(models, { cat: 'flowers' }))).toEqual(['tulip']);
    expect(ids(filterModels(models, { diff: 'medium' }))).toEqual(['kabuto']);
    expect(ids(filterModels(models, { cat: 'animals', diff: 'medium' }))).toEqual([]);
    expect(ids(filterModels(models, { q: 'face', cat: 'animals', diff: 'easy' }))).toEqual(['fox-face']);
  });
});

describe('parseLibrarySearch', () => {
  it('keeps known values and trims the query', () => {
    expect(parseLibrarySearch({ q: ' fox ', cat: 'animals', diff: 'hard' })).toEqual({
      q: 'fox',
      cat: 'animals',
      diff: 'hard'
    });
  });

  it('turns unknown, empty and non-string values into undefined keys instead of failing', () => {
    const parsed = parseLibrarySearch({ q: '  ', cat: 'cars', diff: 3 });
    expect(parsed).toStrictEqual({ q: undefined, cat: undefined, diff: undefined });
    expect(parseLibrarySearch({ q: ['a'] }).q).toBeUndefined();
  });
});
