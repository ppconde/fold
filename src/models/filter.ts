import type { ModelEntry } from './catalog';

export type Category = ModelEntry['category'];
export type Difficulty = ModelEntry['difficulty'];
export type LibrarySearch = { q?: string; cat?: Category; diff?: Difficulty };

export const CATEGORIES: Category[] = ['animals', 'flowers', 'objects', 'geometric'];
export const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/**
 * Search params from the URL; anything unknown or empty becomes undefined, never an error.
 * Every key is returned even when undefined: TanStack Router merges a route's search over the raw params,
 * so a key left out would come back with its invalid value.
 */
export function parseLibrarySearch(search: Record<string, unknown>): LibrarySearch {
  const q = typeof search.q === 'string' ? search.q.trim() : '';
  return {
    q: q || undefined,
    cat: CATEGORIES.find((c) => c === search.cat),
    diff: DIFFICULTIES.find((d) => d === search.diff)
  };
}

const plain = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** The entries matching every word of `q` (in either language's name, the Japanese name or a tag) and both filters. */
export function filterModels(models: ModelEntry[], { q, cat, diff }: LibrarySearch): ModelEntry[] {
  const words = plain(q ?? '')
    .split(/\s+/)
    .filter(Boolean);
  return models.filter((m) => {
    if ((cat && m.category !== cat) || (diff && m.difficulty !== diff)) return false;
    const text = plain([m.name.en, m.name.pt ?? '', m.japaneseName ?? '', ...m.tags].join(' '));
    return words.every((w) => text.includes(w));
  });
}
