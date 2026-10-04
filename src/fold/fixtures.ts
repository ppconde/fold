import { readFileSync } from 'node:fs';

/** Test helper: raw JSON of a model in public/models. */
export function fixture(name: 'fold-in-half' | 'fold-in-quarters'): unknown {
  return JSON.parse(readFileSync(new URL(`../../public/models/${name}.fold`, import.meta.url), 'utf8'));
}
