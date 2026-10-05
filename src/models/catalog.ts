import { FoldError, loadModel } from '../fold/load-model';
import type { Model } from '../fold/types';

export type ModelEntry = {
  id: string;
  name: string;
  japaneseName?: string;
  category: 'animals' | 'flowers' | 'objects' | 'geometric';
  difficulty: 'easy' | 'medium' | 'hard';
  tags: string[];
  thumbnail?: string;
};

async function readJson(url: string, what: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new FoldError(`The ${what} could not be downloaded (${res.status}).`);
  try {
    return await res.json();
  } catch {
    throw new FoldError(`The ${what} is not a FOLD file.`);
  }
}

export async function fetchIndex(): Promise<ModelEntry[]> {
  const index = await readJson('/models/models.json', 'model library');
  if (!Array.isArray(index)) throw new FoldError('The model library is not a list.');
  return index as ModelEntry[];
}

/** The model with this id, or null when the library does not list it. */
export async function fetchModel(id: string): Promise<{ entry: ModelEntry; model: Model } | null> {
  const entry = (await fetchIndex()).find((e) => e.id === id);
  if (!entry) return null;
  const json = await readJson(`/models/${id}.fold`, 'model file');
  return { entry, model: loadModel(json) };
}
